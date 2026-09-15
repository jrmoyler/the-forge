import * as THREE from "three";
// Keep animated objects and raycast targets intact; instance only static repeated meshes.
export function batchStaticGeometry(scene, exclusions = []) {
  const excluded = new Set(exclusions);
  const groups = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      Array.isArray(object.material) ||
      !object.material.visible
    )
      return;
    for (let p = object; p; p = p.parent) if (excluded.has(p)) return;
    const key = object.geometry.uuid + "/" + object.material.uuid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(object);
  });
  let removed = 0,
    batches = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < 3) continue;
    const batch = new THREE.InstancedMesh(
      meshes[0].geometry,
      meshes[0].material,
      meshes.length,
    );
    batch.castShadow = meshes.some((m) => m.castShadow);
    batch.receiveShadow = meshes.some((m) => m.receiveShadow);
    meshes.forEach((mesh, i) => batch.setMatrixAt(i, mesh.matrixWorld));
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    scene.add(batch);
    meshes.forEach((mesh) => mesh.removeFromParent());
    removed += meshes.length;
    batches++;
  }
  return { removed, batches };
}
