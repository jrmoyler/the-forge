import * as THREE from "three";

export function buildCampus(
  scene,
  { software = false, quality = "balanced" } = {},
) {
  const material = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    stone: material("#8b9585"),
    stoneDark: material("#536555"),
    trim: material("#c5c0a8"),
    slate: material("#293e3e", 0.66),
    brass: material("#b28a50", 0.3, 0.65),
    wood: material("#694b32"),
    dark: material("#24312c"),
    soil: material("#28382c"),
    leaf: material("#55794f"),
    leafLight: material("#779063"),
    paper: material("#e1d6b8"),
    glass: material("#708d82", 0.2, 0.2),
    glow: new THREE.MeshStandardMaterial({
      color: "#efd39b",
      emissive: "#de9d44",
      emissiveIntensity: software ? 0.2 : 1.4,
    }),
  };
  const shared = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, software ? 12 : 24),
    leaf: new THREE.IcosahedronGeometry(1, 1),
  };
  function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) {
    const mesh = new THREE.Mesh(shared.box, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cyl(r, h, mat, x = 0, y = 0, z = 0, parent = scene) {
    const mesh = new THREE.Mesh(shared.cyl, mat);
    mesh.scale.set(r, h, r);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function sphere(r, mat, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(shared.leaf, mat);
    mesh.scale.setScalar(r);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function arch(width, height, depth, mat, x, y, z, parent) {
    const shape = new THREE.Shape(),
      r = width / 2,
      base = height - r;
    shape.moveTo(-r, 0);
    shape.lineTo(-r, base);
    shape.absarc(0, base, r, Math.PI, 0, true);
    shape.lineTo(r, 0);
    shape.lineTo(r - 0.18, 0);
    shape.lineTo(r - 0.18, base);
    shape.absarc(0, base, r - 0.18, 0, Math.PI, false);
    shape.lineTo(-r + 0.18, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: software ? 8 : 16,
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function roof(w, d, h, x, y, z, parent) {
    const roof = new THREE.Group();
    roof.position.set(x, y, z);
    parent.add(roof);
    for (const side of [-1, 1]) {
      const panel = box(
        w + 0.32,
        0.16,
        Math.hypot(d / 2, h),
        M.slate,
        0,
        h / 2,
        (side * d) / 4,
        roof,
      );
      panel.rotation.x = -side * Math.atan2(h, d / 2);
      box(w + 0.55, 0.15, 0.17, M.brass, 0, 0, side * (d / 2 + 0.05), roof);
    }
    box(w + 0.6, 0.12, 0.14, M.brass, 0, h, 0, roof);
    return roof;
  }
  function tree(x, z, s = 1) {
    const group = new THREE.Group();
    group.position.set(x, -0.06, z);
    scene.add(group);
    cyl(0.46 * s, 0.35, M.stoneDark, 0, 0.1, 0, group);
    cyl(0.34 * s, 0.07, M.soil, 0, 0.3, 0, group);
    cyl(0.095 * s, 1.8 * s, M.wood, 0, 1 * s, 0, group);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      sphere(
        0.55 * s,
        i % 2 ? M.leaf : M.leafLight,
        Math.sin(a) * 0.28 * s,
        (1.7 + i * 0.15) * s,
        Math.cos(a) * 0.28 * s,
        group,
      );
    }
    return group;
  }
  function bench(x, z, angle = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0.0, z);
    g.rotation.y = angle;
    scene.add(g);
    for (let k = 0; k < 3; k++)
      box(1.8, 0.09, 0.13, M.wood, 0, 0.45, k * 0.14, g);
    box(1.8, 0.4, 0.08, M.wood, 0, 0.77, 0.43, g);
    for (const side of [-1, 1])
      box(0.12, 0.47, 0.5, M.dark, side * 0.65, 0.23, 0.16, g);
  }
  function lantern(x, z) {
    cyl(0.045, 1.7, M.brass, x, 0.8, z);
    box(0.32, 0.12, 0.32, M.dark, x, 1.68, z);
    box(0.22, 0.34, 0.22, M.glow, x, 1.87, z);
    box(0.36, 0.12, 0.36, M.brass, x, 2.1, z);
  }
  // Terraced stone plinth with a paved apron, retaining wall and entry staircase.
  cyl(14.5, 0.65, M.dark, 0, -1.1, 0);
  cyl(14.2, 0.24, M.brass, 0, -0.7, 0);
  cyl(14, 0.65, M.stoneDark, 0, -0.3, 0);
  cyl(13.8, 0.12, M.stone, 0, 0.08, 0);
  const apron = new THREE.Mesh(
    new THREE.RingGeometry(5.0, 13.65, 64, 1),
    M.stoneDark,
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.15;
  apron.receiveShadow = true;
  scene.add(apron);
  for (let i = 0; i < 40; i++) {
    const a = (i * Math.PI) / 20;
    const b = box(
      0.1,
      0.04,
      1.5,
      M.trim,
      Math.sin(a) * 13,
      0.18,
      Math.cos(a) * 13,
    );
    b.rotation.y = a;
  }
  // Inlaid paving creates real routes between the working districts.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    for (let j = 0; j < 5; j++) {
      const r = 4.6 + j * 0.53;
      const p = box(
        1.55,
        0.06,
        0.46,
        j % 2 ? M.stone : M.trim,
        Math.sin(a) * r,
        0.21,
        Math.cos(a) * r,
      );
      p.rotation.y = a;
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    cyl(0.065, 0.9, M.brass, Math.sin(a) * 4.0, 0.7, Math.cos(a) * 4.0);
  }
  for (let k = 0; k < 5; k++)
    box(
      3.3 - k * 0.1,
      0.18,
      0.46,
      M.trim,
      0,
      -0.64 + k * 0.17,
      14.5 - k * 0.38,
    );
  // The heart of the academy: a stepped working forge and animated armillary.
  cyl(3.7, 0.13, M.trim, 0, 0.22, 0);
  cyl(3.5, 0.09, M.stoneDark, 0, 0.33, 0);
  cyl(2.8, 0.08, M.stone, 0, 0.41, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const inlay = box(
      0.035,
      0.02,
      2,
      M.brass,
      Math.sin(a) * 2.35,
      0.46,
      Math.cos(a) * 2.35,
    );
    inlay.rotation.y = a;
  }
  cyl(1.65, 0.3, M.stoneDark, 0, 0.6, 0);
  cyl(1.32, 0.25, M.brass, 0, 0.86, 0);
  cyl(0.8, 1.45, M.dark, 0, 1.7, 0);
  cyl(1.15, 0.18, M.brass, 0, 2.46, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rib = box(
      0.13,
      1.25,
      0.22,
      M.brass,
      Math.sin(a) * 0.79,
      1.68,
      Math.cos(a) * 0.79,
    );
    rib.rotation.y = a;
  }
  const armillary = new THREE.Group();
  armillary.position.set(0, 3.25, 0);
  scene.add(armillary);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.04 + i * 0.1, 0.035, 6, software ? 28 : 64),
      M.brass,
    );
    mesh.rotation.set(0.8 + i * 0.65, 0.3 + i, 0.4);
    armillary.add(mesh);
    rings.push(mesh);
  }
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.56), M.glow);
  armillary.add(heart);
  const positions = [
    [-7.4, 0, -5.5],
    [0, 0, -9],
    [7.4, 0, -5.5],
    [7.2, 0, 5.3],
    [-7.2, 0, 5.3],
  ];
  const colors = ["#caa76c", "#80b8aa", "#b49bc7", "#83aec9", "#d49a7b"];
  const hitboxes = [],
    accents = [],
    flags = [];
  const buildings = [];
  positions.forEach(([x, y, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(x, z);
    scene.add(g);
    buildings.push(g);
    const accent = material(colors[i], 0.5, 0.18);
    accent.emissive = new THREE.Color(colors[i]);
    accent.emissiveIntensity = 0.03;
    accents.push(accent);
    box(5.5, 0.28, 4.9, M.stoneDark, 0, 0.26, 0, g);
    box(5.3, 0.09, 4.7, M.trim, 0, 0.44, 0, g);
    box(4.95, 0.08, 4.35, M.wood, 0, 0.51, 0, g);
    // Rear range with glowing arched windows; cutaway front reveals furniture.
    box(5, 3.2, 0.32, M.stone, 0, 2.12, 2.08, g);
    box(0.28, 1.12, 4.2, M.stone, -2.38, 1.04, 0, g);
    box(0.28, 1.12, 4.2, M.stone, 2.38, 1.04, 0, g);
    for (const side of [-1, 0, 1]) {
      box(0.82, 1.36, 0.07, M.glow, side * 1.5, 2.3, 1.885, g);
      arch(1.0, 1.7, 0.1, M.trim, side * 1.5, 1.6, 1.77, g);
      box(0.045, 1.37, 0.12, M.brass, side * 1.5, 2.3, 1.78, g);
      box(0.88, 0.05, 0.12, M.brass, side * 1.5, 2.23, 1.77, g);
    }
    for (const sx of [-2.38, 2.38]) {
      box(0.47, 3.6, 0.47, M.stoneDark, sx, 2.18, 1.98, g);
      box(0.65, 0.22, 0.64, M.trim, sx, 3.92, 1.98, g);
      box(0.65, 0.22, 0.64, M.trim, sx, 0.7, 1.98, g);
      box(0.38, 2.75, 0.38, M.stone, sx, 2.0, -1.98, g);
      box(0.53, 0.2, 0.54, M.trim, sx, 3.43, -1.98, g);
    }
    for (const sx of [-0.785, 0.785]) {
      box(0.17, 1.26, 0.25, M.stone, sx, 1.15, -2.01, g);
      box(0.3, 0.13, 0.34, M.trim, sx, 1.74, -2.01, g);
    }
    // Continuous open arcade over the front entrances.
    for (const sx of [-1.57, 0, 1.57])
      arch(1.56, 1.7, 0.22, M.trim, sx, 1.72, -2.12, g);
    box(5.4, 0.24, 0.48, M.stoneDark, 0, 3.53, -1.98, g);
    box(5.55, 0.11, 0.57, M.brass, 0, 3.71, -1.98, g);
    roof(5.3, 1.55, i === 1 ? 1.5 : 0.75, 0, 3.8, 1.78, g);
    for (let k = 0; k < 3; k++)
      box(2.0, 0.16, 0.43, M.trim, 0, 0.35 - k * 0.13, -2.54 - k * 0.4, g);
    // Hanging pennants carry district identity without billboard textures.
    for (const sx of [-2.0, 2.0]) {
      box(0.05, 0.05, 0.78, M.brass, sx, 3.22, -2.31, g);
      const banner = box(0.46, 0.87, 0.028, accent, sx, 2.75, -2.61, g);
      flags.push(banner);
      box(0.03, 0.87, 0.036, M.brass, sx, 2.75, -2.64, g);
    }
    // Roof silhouette variations make each department recognizable.
    if (i === 0) {
      const globe = new THREE.Group();
      globe.position.set(0, 5.0, 2);
      g.add(globe);
      sphere(0.43, M.glass, 0, 0, 0, globe);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.025, 6, 32),
        M.brass,
      );
      rim.rotation.x = 0.75;
      globe.add(rim);
      cyl(0.13, 0.4, M.brass, 0, -0.56, 0, globe);
    }
    if (i === 1) {
      box(0.62, 1.5, 0.62, M.stoneDark, -1.6, 5.0, 2.0, g);
      box(0.85, 0.2, 0.85, M.trim, -1.6, 5.8, 2, g);
      box(0.4, 0.72, 0.4, M.brass, 1.5, 5, 2, g);
    }
    if (i === 2) {
      box(0.8, 0.9, 0.1, M.glass, 0, 4.48, 0.8, g);
      arch(1.05, 1.3, 0.13, M.trim, 0, 4, 0.68, g);
    }
    if (i === 3) {
      for (const sx of [-1.2, 1.2]) {
        cyl(0.13, 1.4, M.brass, sx, 5, 2, g);
        sphere(0.22, M.glow, sx, 5.7, 2, g);
      }
    }
    if (i === 4) {
      box(1.2, 1.2, 0.6, M.stone, 0, 4.9, 2, g);
      const clock = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), M.paper);
      clock.position.set(0, 5.0, 1.69);
      g.add(clock);
      box(0.03, 0.27, 0.03, M.dark, 0, 5.08, 1.65, g);
      const hand = box(0.24, 0.03, 0.03, M.dark, 0.1, 5, 1.64, g);
      roof(1.4, 0.8, 0.45, 0, 5.55, 2, g);
    }
    // Bespoke interior equipment, in the target scene rather than flat imagery.
    if (i === 0 || i === 4) {
      box(2.9, 0.15, 1.2, M.wood, 0, 1.32, 0.3, g);
      for (const sx of [-1.1, 1.1])
        box(0.15, 0.76, 0.9, M.dark, sx, 0.9, 0.3, g);
      for (let n = 0; n < 4; n++) {
        box(0.43, 0.035, 0.53, M.paper, -1 + n * 0.66, 1.42, 0.3, g);
        box(0.48, 0.12, 0.43, M.wood, -1 + n * 0.66, 0.85, -0.8, g);
        box(0.45, 0.55, 0.08, M.dark, -1 + n * 0.66, 1.14, -1, g);
      }
      if (i === 4) {
        for (let k = 0; k < 2; k++) {
          box(0.8, 1.4, 0.45, M.wood, -1.7 + k * 3.4, 1.43, 1.55, g);
          for (let b = 0; b < 7; b++)
            box(
              0.065,
              0.4,
              0.25,
              b % 2 ? accent : M.paper,
              -1.94 + k * 3.4 + b * 0.075,
              1.3,
              1.34,
              g,
            );
        }
      }
    }
    if (i === 1) {
      box(3.1, 0.16, 1.35, M.wood, 0, 1.32, 0.35, g);
      for (let n = 0; n < 3; n++) {
        box(0.8, 0.57, 0.08, M.dark, -1 + n, 1.75, 0.52, g);
        box(0.71, 0.46, 0.02, accent, -1 + n, 1.75, 0.465, g);
        box(0.12, 0.27, 0.15, M.brass, -1 + n, 1.45, 0.5, g);
        box(0.64, 0.03, 0.24, M.paper, -1 + n, 1.43, 0.03, g);
      }
      cyl(0.55, 0.13, M.brass, 0, 1, -0.95, g);
      const model = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.38, 0.08, 40, 6),
        accent,
      );
      model.position.set(0, 1.65, -0.95);
      g.add(model);
    }
    if (i === 2) {
      for (let n = 0; n < 2; n++) {
        for (const xx of [-0.32, 0.32]) {
          const leg = box(
            0.06,
            1.6,
            0.06,
            M.wood,
            -1 + n * 2 + xx,
            1.35,
            0.4,
            g,
          );
          leg.rotation.z = xx * 0.2;
        }
        box(1.04, 1.2, 0.065, M.paper, -1 + n * 2, 1.9, 0.28, g);
        box(0.8, 0.75, 0.02, accent, -1 + n * 2, 2, 0.239, g);
        box(0.45, 0.4, 0.025, M.brass, -0.9 + n * 2, 1.85, 0.218, g);
      }
      cyl(0.43, 0.15, M.wood, 0, 1, -1.1, g);
    }
    if (i === 3) {
      for (let n = 0; n < 3; n++) {
        box(0.83, 1.7, 0.72, M.dark, -1.15 + n * 1.15, 1.4, 0.6, g);
        for (let k = 0; k < 4; k++) {
          box(
            0.64,
            0.2,
            0.04,
            M.stoneDark,
            -1.15 + n * 1.15,
            0.91 + k * 0.3,
            0.22,
            g,
          );
          box(
            0.06,
            0.06,
            0.05,
            accent,
            -0.9 + n * 1.15,
            0.94 + k * 0.3,
            0.19,
            g,
          );
        }
      }
    }
    const hit = box(
      5.3,
      5.1,
      4.6,
      new THREE.MeshBasicMaterial({ visible: false }),
      0,
      2.7,
      0,
      g,
    );
    hit.userData.district = i;
    hitboxes.push(hit);
  });
  for (let i = 0; i < 10; i++) {
    const a = ((i + 0.32) * Math.PI) / 5;
    tree(Math.sin(a) * 11.7, Math.cos(a) * 11.7, 0.85 + (i % 3) * 0.15);
  }
  for (let i = 0; i < 10; i++) {
    const a = ((i + 0.6) * Math.PI) / 5;
    lantern(Math.sin(a) * 12.7, Math.cos(a) * 12.7);
  }
  for (const [x, z, a] of [
    [-4.5, 6.6, -0.5],
    [4.5, 6.6, 0.5],
    [-4.8, -3, 1.4],
    [4.8, -3, -1.4],
  ])
    bench(x, z, a);
  // Apprentice model with articulated limbs, coat, satchel and walking pose.
  const avatar = new THREE.Group();
  scene.add(avatar);
  avatar.position.set(-2.6, 0.45, 1.7);
  const coat = material("#cab889"),
    skin = material("#ab7856"),
    hair = material("#2b2420");
  const torso = box(0.4, 0.52, 0.23, coat, 0, 0.83, 0, avatar);
  cyl(0.13, 0.21, skin, 0, 1.22, 0, avatar);
  sphere(0.16, hair, 0, 1.34, 0.005, avatar);
  box(0.32, 0.25, 0.05, M.wood, 0, 0.77, 0.16, avatar);
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.24, 1.02, 0);
    avatar.add(arm);
    box(0.13, 0.42, 0.14, coat, 0, -0.19, 0, arm);
    sphere(0.065, skin, 0, -0.43, 0, arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.58, 0);
    avatar.add(leg);
    box(0.14, 0.45, 0.17, M.dark, 0, -0.2, 0, leg);
    box(0.17, 0.1, 0.26, M.wood, 0, -0.45, -0.035, leg);
    limbs.push(arm, leg);
  }
  return {
    positions,
    buildings,
    hitboxes,
    accents,
    flags,
    avatar,
    limbs,
    heart,
    rings,
    materials: M,
  };
}
