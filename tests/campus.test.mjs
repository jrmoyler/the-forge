import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildCampus } from "../src/world/architecture.js";
test("campus has five distinct selectable districts and valid finite geometry", () => {
  const scene = new THREE.Scene();
  const w = buildCampus(scene, { software: true });
  assert.equal(w.buildings.length, 5);
  assert.equal(w.hitboxes.length, 5);
  assert.equal(w.limbs.length, 4);
  assert.deepEqual(
    w.hitboxes.map((h) => h.userData.district),
    [0, 1, 2, 3, 4],
  );
  scene.updateMatrixWorld(true);
  let triangles = 0,
    meshes = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    for (const v of o.matrixWorld.elements) assert(Number.isFinite(v));
    const p = o.geometry.attributes.position;
    for (const v of p.array) assert(Number.isFinite(v));
    triangles += (o.geometry.index?.count || p.count) / 3;
  });
  assert(meshes > 400);
  assert(
    triangles < 100000,
    "Software fallback should have a bounded geometry budget",
  );
  console.log({ meshes, triangles });
});
import { batchStaticGeometry } from "../src/world/batching.js";
test("GPU batching reduces draw objects without absorbing actors or district targets", () => {
  const scene = new THREE.Scene();
  const w = buildCampus(scene);
  const result = batchStaticGeometry(scene, [
    w.avatar,
    w.heart,
    ...w.rings,
    ...w.flags,
    ...w.hitboxes,
  ]);
  assert(result.removed - result.batches > 400);
  assert.equal(w.avatar.parent, scene);
  for (const hit of w.hitboxes) assert(hit.parent);
  assert(w.limbs.every((l) => l.parent === w.avatar));
  let count = 0;
  scene.traverse((o) => {
    if (o.isMesh) count++;
  });
  assert(count < 150);
  console.log({ gpuMeshObjects: count, instancedBatches: result.batches });
});
