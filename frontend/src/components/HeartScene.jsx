import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Center, ContactShadows, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Color, MeshBasicMaterial, MeshPhysicalMaterial, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function heartbeatEnvelope(phase, s1Phase = 0.08, s2Phase = 0.3) {
  const systolic = Math.exp(-Math.pow((phase - s1Phase) / 0.055, 2));
  const rebound = 0.52 * Math.exp(-Math.pow((phase - s2Phase) / 0.08, 2));
  return systolic + rebound;
}

function HeartMesh({ bpm, diagnosis, defenseMode, active, onHoverChange, twinState }) {
  const groupRef = useRef(null);
  const shellRef = useRef(null);
  const renderActiveRef = useRef(true);
  const stl = useLoader(STLLoader, "/models/human-heart.stl");
  const bpmSafe = Math.max(35, bpm || 72);
  const beat = bpmSafe / 60;
  const murmurIntensity = Number(twinState?.murmur_intensity ?? 0);
  const turbulence = Number(twinState?.turbulence ?? 0);
  const rrVariability = Number(twinState?.rr_variability ?? 0);
  const rhythmState = twinState?.rhythm_state ?? "regular";
  const visualState = twinState?.visual_state ?? (diagnosis === "Abnormal" ? "alert" : "normal");
  const signalQuality = Number(twinState?.signal_quality ?? 1);
  const confidence = Number(twinState?.confidence ?? 0.72);
  const pulseVariation = Number(twinState?.pulse_variation ?? 0.04);
  const glowStrength = Number(twinState?.glow_strength ?? 0.42);

  const geometry = useMemo(() => {
    const clone = stl.clone();
    clone.computeVertexNormals();
    clone.center();
    clone.computeBoundingBox();

    const box = clone.boundingBox;
    const sizeX = box.max.x - box.min.x;
    const sizeY = box.max.y - box.min.y;
    const sizeZ = box.max.z - box.min.z;
    const maxDim = Math.max(sizeX, sizeY, sizeZ);
    const scale = 2.3 / maxDim;

    clone.scale(scale, scale, scale);
    clone.rotateX(-Math.PI / 2);
    clone.scale(-1, -1, 1);
    clone.rotateY(Math.PI * 1.18);
    clone.rotateZ(Math.PI * 0.44);
    clone.translate(0, -0.08, 0);
    clone.computeVertexNormals();
    return clone;
  }, [stl]);

  const palette = visualState === "alert"
    ? {
        color: "#dc2626",
        emissive: "#7f1d1d",
        sheen: "#fecaca",
        wire: "#ffe4e6",
        lowTone: "#991b1b",
        midTone: "#ef4444",
        highTone: "#fca5a5",
        edgeTone: "#fff7ed",
        shellTone: "#fb7185"
      }
      : visualState === "caution"
        ? {
          color: "#d97706",
          emissive: "#92400e",
          sheen: "#fde68a",
          wire: "#ffedd5",
          lowTone: "#b45309",
          midTone: "#f59e0b",
          highTone: "#fbbf24",
          edgeTone: "#fffbeb",
          shellTone: "#f59e0b"
      }
      : {
          color: "#14b8a6",
          emissive: "#0f766e",
          sheen: "#99f6e4",
          wire: "#ccfbf1",
          lowTone: "#115e59",
          midTone: "#0f766e",
          highTone: "#a7f3d0",
          edgeTone: "#ecfeff",
          shellTone: "#2dd4bf"
      };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncVisibility = () => {
      renderActiveRef.current = document.visibilityState === "visible" && !mediaQuery.matches;
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    mediaQuery.addEventListener("change", syncVisibility);

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      mediaQuery.removeEventListener("change", syncVisibility);
    };
  }, []);

  const material = useMemo(
    () =>
        new MeshPhysicalMaterial({
          color: palette.color,
        roughness: visualState === "alert" ? 0.46 : visualState === "caution" ? 0.4 : 0.36,
          metalness: 0.04,
        clearcoat: 0.72,
        clearcoatRoughness: 0.22,
        sheen: 0.72,
          sheenColor: palette.sheen,
          emissive: palette.emissive,
        emissiveIntensity: 0.34 + glowStrength * 0.48
      }),
    [glowStrength, palette.color, palette.emissive, palette.sheen, visualState]
  );

  useEffect(() => {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying vec3 vModelPosition;
      ` + shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vModelPosition = position;`
      );

      shader.fragmentShader = `
        varying vec3 vModelPosition;
      ` + shader.fragmentShader.replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
        float topBlend = smoothstep(0.1, 0.95, vModelPosition.y);
        float sideBlend = smoothstep(0.0, 0.85, abs(vModelPosition.x));
        float centerBlend = smoothstep(-0.2, 0.25, vModelPosition.y) * (1.0 - smoothstep(0.25, 0.78, vModelPosition.y));
        vec3 lowTone = vec3(${new Color(palette.lowTone).r.toFixed(3)}, ${new Color(palette.lowTone).g.toFixed(3)}, ${new Color(palette.lowTone).b.toFixed(3)});
        vec3 midTone = vec3(${new Color(palette.midTone).r.toFixed(3)}, ${new Color(palette.midTone).g.toFixed(3)}, ${new Color(palette.midTone).b.toFixed(3)});
        vec3 highTone = vec3(${new Color(palette.highTone).r.toFixed(3)}, ${new Color(palette.highTone).g.toFixed(3)}, ${new Color(palette.highTone).b.toFixed(3)});
        vec3 edgeTone = vec3(${new Color(palette.edgeTone).r.toFixed(3)}, ${new Color(palette.edgeTone).g.toFixed(3)}, ${new Color(palette.edgeTone).b.toFixed(3)});
        vec3 blended = mix(lowTone, midTone, centerBlend);
        blended = mix(blended, highTone, topBlend);
        blended = mix(blended, edgeTone, sideBlend * 0.16);
        vec4 diffuseColor = vec4(blended, opacity);
        `
      );
    };
    material.needsUpdate = true;
  }, [material, palette.edgeTone, palette.highTone, palette.lowTone, palette.midTone]);

  const wireMaterial = useMemo(
    () =>
        new MeshBasicMaterial({
        color: palette.wire,
        wireframe: true,
        transparent: true,
        opacity: Math.min(0.46, (defenseMode ? 0.34 : 0.16) + murmurIntensity * 0.2 + (1 - signalQuality) * 0.08)
      }),
    [defenseMode, murmurIntensity, palette.wire, signalQuality]
  );

  const shellMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: palette.shellTone,
        transparent: true,
        opacity: Math.min(0.38, (visualState === "alert" ? 0.2 : visualState === "caution" ? 0.16 : 0.13) + murmurIntensity * 0.14 + (1 - signalQuality) * 0.06),
        roughness: 0.2,
        metalness: 0.02,
        clearcoat: 0.95,
        emissive: palette.emissive,
        emissiveIntensity: 0.12 + turbulence * 0.16 + glowStrength * 0.08
      }),
    [glowStrength, murmurIntensity, palette.emissive, palette.shellTone, signalQuality, turbulence, visualState]
  );

  useFrame((state) => {
    if (!renderActiveRef.current) {
      return;
    }

    const irregularOffset = rhythmState === "irregular" ? Math.sin(state.clock.elapsedTime * 2.7) * rrVariability * 0.28 : 0;
    const phase = (state.clock.elapsedTime * beat + irregularOffset) % 1;
    const pulseEnvelope = heartbeatEnvelope(phase, twinState?.s1_phase, twinState?.s2_phase);
    const pulseAmplitude = (visualState === "alert" ? 0.12 : visualState === "caution" ? 0.082 : 0.064) + murmurIntensity * 0.05 + pulseVariation * 0.2;
    const pulse = 1 + pulseEnvelope * pulseAmplitude;
    const shellPulse = 1 + pulseEnvelope * ((visualState === "alert" ? 0.15 : visualState === "caution" ? 0.1 : 0.082) + turbulence * 0.05 + pulseVariation * 0.1);
    const tremor = (visualState === "alert" || rhythmState === "irregular")
      ? Math.sin(state.clock.elapsedTime * (18 + turbulence * 8)) * (0.01 + rrVariability * 0.05 + turbulence * 0.006 + (1 - signalQuality) * 0.01)
      : 0;
    const verticalBob = pulseEnvelope * (visualState === "alert" ? 0.02 : visualState === "caution" ? 0.015 : 0.011);

    if (groupRef.current) {
      groupRef.current.scale.lerp(new Vector3(pulse, pulse, pulse), 0.26);
      groupRef.current.rotation.y += visualState === "alert" ? 0.0021 : visualState === "caution" ? 0.0011 : active ? 0.0008 : 0.00035;
      groupRef.current.rotation.x = Math.PI + tremor;
      groupRef.current.rotation.z = Math.PI * 1.02 + tremor * 1.8;
      groupRef.current.position.x = tremor * 0.45;
      groupRef.current.position.y = verticalBob;
    }

    if (shellRef.current) {
      shellRef.current.scale.lerp(new Vector3(shellPulse, shellPulse, shellPulse), 0.26);
    }

    material.emissive.lerp(new Color(palette.emissive), 0.08);
    material.color.lerp(new Color(palette.color), 0.08);
    material.emissiveIntensity += (((visualState === "alert" ? 0.98 : visualState === "caution" ? 0.74 : active ? 0.62 : 0.34) + murmurIntensity * 0.26 + glowStrength * 0.14) - material.emissiveIntensity) * 0.12;
    material.clearcoat += (((visualState === "alert" ? 0.94 : visualState === "caution" ? 0.86 : 0.76)) - material.clearcoat) * 0.12;
    shellMaterial.color.lerp(new Color(palette.shellTone), 0.08);
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={() => onHoverChange(true)}
      onPointerOut={() => onHoverChange(false)}
    >
      <Center>
        <group>
          <mesh geometry={geometry} material={material} castShadow receiveShadow />
          <mesh ref={shellRef} geometry={geometry} material={shellMaterial} />
          <mesh geometry={geometry} material={wireMaterial} />
        </group>
      </Center>
    </group>
  );
}

export default function HeartScene({ bpm, diagnosis, defenseMode, theme, active, onHoverChange, twinState }) {
  const visualState = twinState?.visual_state ?? (diagnosis === "Abnormal" ? "alert" : "normal");
  const background =
    theme === "dark"
      ? visualState === "alert"
      ? "#3f161a"
        : visualState === "caution"
          ? "#3d2a12"
          : "#123524"
      : visualState === "alert"
        ? "#fff0f1"
        : visualState === "caution"
          ? "#fff8e7"
          : "#effaf2";

  return (
    <div className="heart-canvas-shell">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} shadows>
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 5.8, 10.8]} />
        <PerspectiveCamera makeDefault position={[0, 0.02, 7.1]} fov={21} />
        <ambientLight intensity={1.08} color={theme === "dark" ? "#ffffff" : "#ffffff"} />
        <directionalLight
          position={[5, 6, 4]}
          intensity={2.2}
          color={visualState === "alert" ? "#fff1f2" : visualState === "caution" ? "#fff7d6" : "#ecfeff"}
          castShadow
        />
        <directionalLight
          position={[-4, 1, 5]}
          intensity={1.2}
          color={visualState === "alert" ? "#fecdd3" : visualState === "caution" ? "#fde68a" : "#99f6e4"}
        />
        <directionalLight
          position={[0, -3, 4]}
          intensity={0.45}
          color={visualState === "alert" ? "#fda4af" : visualState === "caution" ? "#fbbf24" : "#ccfbf1"}
        />
        <HeartMesh
          bpm={bpm}
          diagnosis={diagnosis}
          defenseMode={defenseMode}
          active={active}
          onHoverChange={onHoverChange}
          twinState={twinState}
        />
        <ContactShadows
          position={[0, -1.9, 0]}
          opacity={0.18}
          scale={4.2}
          blur={2.8}
          far={3.2}
          color="#04110f"
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 2.25}
          maxPolarAngle={Math.PI / 1.78}
        />
      </Canvas>
    </div>
  );
}
