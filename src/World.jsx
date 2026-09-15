import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SVGRenderer } from "three/addons/renderers/SVGRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  RotateCcw,
  Minus,
  Plus,
  Expand,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { districts } from "./demo";
import { buildCampus } from "./world/architecture";
const preference = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
export default function World({
  selected,
  onSelect,
  onEnter,
  missionCount = 12,
}) {
  const host = useRef(),
    wrapper = useRef(),
    api = useRef(),
    audio = useRef(),
    callback = useRef(onSelect),
    selectedRef = useRef(selected),
    motion = useRef(true);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [pins, setPins] = useState([]),
    [paused, setPaused] = useState(false),
    [sound, setSound] = useState(false),
    [quality, setQuality] = useState(() =>
      preference("forge-quality", "balanced"),
    ),
    [settings, setSettings] = useState(false),
    [full, setFull] = useState(false),
    [software, setSoftware] = useState(false);
  callback.current = onSelect;
  useEffect(() => {
    selectedRef.current = selected;
    api.current?.go(selected);
    if (sound && selected !== null) {
      const ctx = audio.current;
      if (ctx) {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 220 + selected * 55;
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      }
    }
  }, [selected, sound]);
  useEffect(() => {
    motion.current = !paused;
    api.current?.invalidate();
  }, [paused]);
  useEffect(() => {
    const fn = () => setFull(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);
  useEffect(
    () => () => {
      audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    const el = host.current;
    let renderer,
      frame,
      disposed = false,
      isSoftware = false,
      visible = true,
      dirty = true,
      pmrem,
      environment;
    setReady(false);
    setFailed(false);
    setPins([]);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#17231f");
    try {
      if (quality === "map") throw new Error("Map mode");
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      try {
        renderer = new SVGRenderer();
        renderer.setQuality("low");
        isSoftware = true;
      } catch {
        setFailed(true);
        return;
      }
    }
    setSoftware(isSoftware);
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, quality === "high" ? 2 : 1.35),
    );
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive Forge campus. Use district buttons to navigate.",
    );
    if (!isSoftware) {
      const room = new RoomEnvironment();
      pmrem = new THREE.PMREMGenerator(renderer);
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.22;
      room.dispose();
    }
    scene.add(
      new THREE.HemisphereLight("#dfebdc", "#273328", isSoftware ? 0.75 : 2.1),
    );
    const sun = new THREE.DirectionalLight("#ffe0a6", isSoftware ? 1 : 3.2);
    sun.position.set(-15, 24, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(
      quality === "high" ? 2048 : 1024,
      quality === "high" ? 2048 : 1024,
    );
    Object.assign(sun.shadow.camera, {
      left: -17,
      right: 17,
      top: 17,
      bottom: -17,
      far: 65,
    });
    sun.shadow.normalBias = 0.025;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#a6c8da", isSoftware ? 0.38 : 1.1);
    fill.position.set(12, 16, -12);
    scene.add(fill);
    const world = buildCampus(scene, { software: isSoftware, quality });
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 110);
    const home = new THREE.Vector3(22, 27, 31);
    camera.position.copy(home);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = !reduced;
    controls.enablePan = false;
    controls.minDistance = 17;
    controls.maxDistance = 55;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = 1.23;
    let cameraTarget = null,
      lookTarget = null,
      destination = world.avatar.position.clone();
    controls.addEventListener("start", () => {
      cameraTarget = null;
      lookTarget = null;
      dirty = true;
    });
    controls.addEventListener("change", () => {
      dirty = true;
    });
    api.current = {
      invalidate: () => {
        dirty = true;
      },
      go: (i) => {
        dirty = true;
        if (i === null) {
          destination = new THREE.Vector3(-2.6, 0.45, 1.7);
          cameraTarget = home.clone();
          lookTarget = new THREE.Vector3(0, 1, 0);
        } else {
          const p = world.positions[i];
          destination = new THREE.Vector3(p[0] * 0.56, 0.45, p[2] * 0.56);
          lookTarget = new THREE.Vector3(p[0] * 0.38, 1, p[2] * 0.38);
          cameraTarget = home.clone().multiplyScalar(0.89).add(lookTarget);
        }
        if (reduced) {
          camera.position.copy(cameraTarget);
          controls.target.copy(lookTarget);
          cameraTarget = null;
          lookTarget = null;
          world.avatar.position.copy(destination);
        }
      },
      reset: () => {
        cameraTarget = home.clone();
        lookTarget = new THREE.Vector3(0, 1, 0);
        if (reduced) {
          camera.position.copy(home);
          controls.target.copy(lookTarget);
          cameraTarget = null;
          lookTarget = null;
        }
        dirty = true;
      },
      zoom: (v) => {
        cameraTarget = null;
        camera.position
          .sub(controls.target)
          .multiplyScalar(v)
          .clampLength(17, 55)
          .add(controls.target);
        dirty = true;
      },
    };
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let start;
    const down = (e) => {
      start = [e.clientX, e.clientY];
    };
    const up = (e) => {
      if (!start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 7)
        return;
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(world.hitboxes)[0];
      if (hit) callback.current(hit.object.userData.district);
    };
    const contextLost = (e) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const resize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.zoom = Math.min(1, camera.aspect / 1.32);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) dirty = true;
    });
    io.observe(el);
    resize();
    let last = 0,
      pinLast = 0,
      walkTime = 0;
    const renderPins = () =>
      setPins(
        world.positions.map(([x, y, z]) => {
          const v = new THREE.Vector3(x, 5.9, z).project(camera);
          return {
            x: (v.x * 0.5 + 0.5) * 100,
            y: (-v.y * 0.5 + 0.5) * 100,
            hidden: Math.abs(v.x) > 1.08 || Math.abs(v.y) > 1.08,
          };
        }),
      );
    function draw(t) {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || !visible) {
        last = t;
        return;
      }
      const dt = Math.min((t - last) / 1000, 0.06);
      if (t - last < (isSoftware ? 120 : quality === "high" ? 16 : 32)) return;
      last = t;
      const walking = world.avatar.position.distanceTo(destination) > 0.025;
      const movingCamera = !!cameraTarget;
      if (cameraTarget) {
        const k = 1 - Math.exp(-dt * 4);
        camera.position.lerp(cameraTarget, k);
        controls.target.lerp(lookTarget, k);
        if (camera.position.distanceTo(cameraTarget) < 0.015) {
          cameraTarget = null;
          lookTarget = null;
        }
        dirty = true;
      }
      controls.update();
      if (walking) {
        world.avatar.lookAt(
          destination.x,
          world.avatar.position.y,
          destination.z,
        );
        world.avatar.position.lerp(destination, 1 - Math.exp(-dt * 3));
        walkTime += dt * 9;
        dirty = true;
      }
      world.limbs.forEach(
        (limb, i) =>
          (limb.rotation.x =
            walking && !reduced
              ? Math.sin(walkTime + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.35
              : 0),
      );
      const animate = motion.current && !reduced && !isSoftware;
      if (animate) {
        world.heart.rotation.y += dt * 0.35;
        world.rings.forEach((r, i) => (r.rotation.z += dt * 0.08 * (i + 1)));
        world.flags.forEach(
          (f, i) => (f.rotation.x = Math.sin(t * 0.001 + i) * 0.022),
        );
        dirty = true;
      }
      world.accents.forEach(
        (m, i) =>
          (m.emissiveIntensity = selectedRef.current === i ? 0.2 : 0.03),
      );
      if (dirty) {
        renderer.render(scene, camera);
        if (t - pinLast > 120 || movingCamera) {
          renderPins();
          pinLast = t;
        }
        dirty = false;
      }
    }
    frame = requestAnimationFrame(draw);
    api.current.go(selectedRef.current);
    setReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment?.dispose();
      pmrem?.dispose();
      renderer.dispose?.();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [quality]);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapper.current.requestFullscreen();
    } catch {
      setSettings(true);
    }
  }
  function toggleSound() {
    if (!sound) {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        audio.current ||= new Audio();
        audio.current.resume();
        setSound(true);
      } catch {
        return;
      }
    } else setSound(false);
  }
  return (
    <section
      className={"world-wrap " + (selected !== null ? "district-active" : "")}
      ref={wrapper}
      aria-label="Forge campus"
    >
      <div className="world" ref={host} />
      {!ready && !failed && (
        <div className="world-loading">
          <span className="load-ring" />
          <strong>Opening the courtyard</strong>
          <span>Learning begins at the bench.</span>
        </div>
      )}
      {failed && (
        <div className="world-fallback">
          <h3>Keep your place at the Forge.</h3>
          <p>The 3D renderer was interrupted. Your work is safe.</p>
          <button
            className="btn"
            onClick={() => {
              setQuality("map");
              setFailed(false);
            }}
          >
            Open lightweight map
          </button>
        </div>
      )}
      <div className="world-heading">
        <span className="eyebrow">THE FORGE / LIVING CAMPUS</span>
        <span>
          {selected === null
            ? "COURTYARD · " + missionCount + " LEARNING PATHS"
            : districts[selected].name.toUpperCase()}
        </span>
      </div>
      <div className="world-top-controls">
        <button
          title={sound ? "Mute district sounds" : "Enable district sounds"}
          aria-pressed={sound}
          onClick={toggleSound}
        >
          {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button
          title={paused ? "Resume ambient motion" : "Pause ambient motion"}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button
          title="Display settings"
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
      {settings && (
        <div className="world-settings">
          <label>
            Display mode
            <select
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value);
                try {
                  localStorage.setItem("forge-quality", e.target.value);
                } catch {}
              }}
            >
              <option value="balanced">Balanced</option>
              <option value="high">High detail</option>
              <option value="map">Lightweight map</option>
            </select>
          </label>
          <p>
            {software
              ? "Lightweight geometry view."
              : "Real-time 3D courtyard."}{" "}
            Use the district buttons with a keyboard.
          </p>
          <button className="text-btn" onClick={() => setSettings(false)}>
            Done
          </button>
        </div>
      )}
      {ready &&
        !failed &&
        pins.map((p, i) => (
          <button
            key={i}
            aria-label={"Explore " + districts[i].short}
            aria-pressed={selected === i}
            className={"world-pin " + (selected === i ? "selected" : "")}
            style={{
              left: p.x + "%",
              top: p.y + "%",
              "--pin": districts[i].color,
              visibility: p.hidden ? "hidden" : "visible",
            }}
            onClick={() => onSelect(selected === i ? null : i)}
          >
            <span>0{i + 1}</span>
            {districts[i].short}
          </button>
        ))}
      {selected !== null && (
        <div className="district-entry">
          <span className="tiny">DISTRICT 0{selected + 1}</span>
          <strong>{districts[selected].name}</strong>
          <button onClick={() => onEnter?.(selected)}>
            Explore paths
            <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      <div className="world-bottom">
        <span>
          {selected === null
            ? "Drag to look around. Choose your district."
            : districts[selected].desc}
        </span>
        <div>
          <button title="Zoom in" onClick={() => api.current?.zoom(0.9)}>
            <Plus size={17} />
          </button>
          <button title="Zoom out" onClick={() => api.current?.zoom(1.1)}>
            <Minus size={17} />
          </button>
          <button title="Reset view" onClick={() => api.current?.reset()}>
            <RotateCcw size={17} />
          </button>
          <button
            title={full ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={fullscreen}
          >
            {full ? <Minimize size={17} /> : <Expand size={17} />}
          </button>
        </div>
      </div>
    </section>
  );
}
