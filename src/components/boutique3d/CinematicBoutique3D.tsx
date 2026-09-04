import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Compass,
  ShoppingBag,
  ArrowRight,
  Eye,
  Check,
  RotateCcw,
  Sliders,
  X,
  Crown,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { products } from "../../data/products";
import { Product } from "../../types";

export interface CinematicBoutiqueProps {
  onEnterStorefront?: () => void;
  isFullScreenMode?: boolean;
  onToggleFullScreen?: () => void;
  onClose?: () => void;
  initialView?: "storefront" | "gates" | "interior" | "cotton" | "daily" | "coord";
}

type ViewPreset = "storefront" | "gates" | "interior" | "cotton" | "daily" | "coord";

interface ViewTarget {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  label: string;
  categoryName?: string;
}

export default function CinematicBoutique3D({
  onEnterStorefront,
  isFullScreenMode = false,
  onToggleFullScreen,
  onClose,
  initialView = "storefront",
}: CinematicBoutiqueProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { addToCart } = useStore();

  const [currentView, setCurrentView] = useState<ViewPreset>(initialView);
  const [gatesOpen, setGatesOpen] = useState(false);
  const [goldenLightIntensity, setGoldenLightIntensity] = useState<"warm" | "radiant">("radiant");
  const [isMuted, setIsMuted] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<Product | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // Audio Chime
  const playBoutiqueChime = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, t); // E5
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.45);
    } catch {
      // Audio context error ignore
    }
  };

  // View presets definition
  const viewPresets: Record<ViewPreset, ViewTarget> = useMemo(
    () => ({
      storefront: {
        pos: new THREE.Vector3(0, 5.2, 24),
        target: new THREE.Vector3(0, 3.8, 0),
        label: "Grand Storefront & Road",
      },
      gates: {
        pos: new THREE.Vector3(0, 4.2, 13.5),
        target: new THREE.Vector3(0, 4.5, 0),
        label: "Entrance Gates & Signage",
      },
      interior: {
        pos: new THREE.Vector3(0, 4.0, -1.8),
        target: new THREE.Vector3(0, 3.5, -12),
        label: "Boutique Grand Hall",
      },
      cotton: {
        pos: new THREE.Vector3(-6.8, 3.2, -9.5),
        target: new THREE.Vector3(-8.8, 2.9, -11.2),
        label: "Cotton Suits Collection",
        categoryName: "Cotton Suits",
      },
      daily: {
        pos: new THREE.Vector3(6.8, 3.2, -9.5),
        target: new THREE.Vector3(8.8, 2.9, -11.2),
        label: "Daily Wear Suits",
        categoryName: "Daily Wear Suits",
      },
      coord: {
        pos: new THREE.Vector3(0, 3.2, -8.2),
        target: new THREE.Vector3(0, 2.8, -12.5),
        label: "Ethnic Co-ord Sets",
        categoryName: "Co-ord Sets",
      },
    }),
    [],
  );

  // References to animate in 3D loop
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    leftGate: THREE.Group;
    rightGate: THREE.Group;
    interiorLight: THREE.PointLight;
    chandeliers: THREE.Group[];
    rackItems: { group: THREE.Group; product: Product }[];
    currentCamPos: THREE.Vector3;
    targetCamPos: THREE.Vector3;
    currentLookAt: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    orbitAngleX: number;
    orbitAngleY: number;
    isDragging: boolean;
    lastMouseX: number;
    lastMouseY: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 560;

    // SCENE & RENDERER
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c0b);
    scene.fog = new THREE.FogExp2(0x0a0c0b, 0.016);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const initialPreset = viewPresets[currentView] || viewPresets.storefront;
    camera.position.copy(initialPreset.pos);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // -------------------------------------------------------------
    // TEXTURE GENERATORS
    // -------------------------------------------------------------

    // 1. House of Shriya Premium Signage Texture
    const createSignageTexture = () => {
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 1024;
      signCanvas.height = 256;
      const ctx = signCanvas.getContext("2d");
      if (ctx) {
        // Deep obsidian background with gold border
        ctx.fillStyle = "#070b09";
        ctx.fillRect(0, 0, 1024, 256);

        // Gold ornamental border
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 992, 224);

        ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(26, 26, 972, 204);

        // Gold Crown Insignia
        ctx.fillStyle = "#d4af37";
        ctx.beginPath();
        const cx = 512, cy = 60;
        ctx.moveTo(cx - 30, cy + 18);
        ctx.lineTo(cx - 24, cy - 14);
        ctx.lineTo(cx - 10, cy + 4);
        ctx.lineTo(cx, cy - 22);
        ctx.lineTo(cx + 10, cy + 4);
        ctx.lineTo(cx + 24, cy - 14);
        ctx.lineTo(cx + 30, cy + 18);
        ctx.closePath();
        ctx.fill();

        // Brand Name: HOUSE OF SHRIYA
        const goldGrad = ctx.createLinearGradient(0, 80, 0, 150);
        goldGrad.addColorStop(0, "#fff5d0");
        goldGrad.addColorStop(0.35, "#e5c058");
        goldGrad.addColorStop(0.7, "#b88a28");
        goldGrad.addColorStop(1, "#8e6516");

        ctx.fillStyle = goldGrad;
        ctx.font = "bold 58px 'Cinzel', serif, Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.22em";
        ctx.shadowColor = "rgba(212, 175, 55, 0.75)";
        ctx.shadowBlur = 18;
        ctx.fillText("HOUSE OF SHRIYA", 512, 126);

        // Subtitle
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#e0cf9b";
        ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
        ctx.letterSpacing = "0.45em";
        ctx.fillText("INDIAN ETHNIC HAUTE COUTURE · ATELIER", 512, 178);
      }
      const tex = new THREE.CanvasTexture(signCanvas);
      tex.anisotropy = 8;
      return tex;
    };

    // 2. Ornate Jali Gate Texture (Procedural Indian Filigree Lattice)
    const createJaliGateTexture = () => {
      const jaliCanvas = document.createElement("canvas");
      jaliCanvas.width = 512;
      jaliCanvas.height = 1024;
      const ctx = jaliCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 512, 1024);

        // Iron base frame with golden filigree
        ctx.fillStyle = "#121714";
        ctx.fillRect(0, 0, 512, 1024);

        // Intricate floral arch & lattice cutouts
        ctx.strokeStyle = "#c99a2c";
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, 492, 1004);

        // Diagonal diamond lattice
        ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
        ctx.lineWidth = 3;
        for (let i = -1024; i < 1536; i += 48) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(512, i + 512);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(512, i);
          ctx.lineTo(0, i + 512);
          ctx.stroke();
        }

        // Concentric mandalas
        for (let my = 180; my < 950; my += 220) {
          ctx.beginPath();
          ctx.arc(256, my, 64, 0, Math.PI * 2);
          ctx.strokeStyle = "#e5c058";
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(256, my, 38, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(212, 175, 55, 0.4)";
          ctx.fill();
          ctx.stroke();
        }

        // Top arch crest
        ctx.fillStyle = "#e5c058";
        ctx.beginPath();
        ctx.arc(256, 70, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(jaliCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    // 3. Polished Boutique Marble Floor Texture
    const createMarbleTexture = () => {
      const mCanvas = document.createElement("canvas");
      mCanvas.width = 512;
      mCanvas.height = 512;
      const ctx = mCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#161311";
        ctx.fillRect(0, 0, 512, 512);

        // Tile grid
        ctx.strokeStyle = "rgba(212, 175, 55, 0.28)";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 512, 512);
        ctx.strokeRect(64, 64, 384, 384);

        // Gold veins
        ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
        ctx.beginPath();
        ctx.moveTo(0, 100);
        ctx.bezierCurveTo(180, 220, 280, 120, 512, 380);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(80, 512);
        ctx.bezierCurveTo(240, 360, 320, 420, 512, 120);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(mCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 8);
      return tex;
    };

    // -------------------------------------------------------------
    // LIGHTING SYSTEM
    // -------------------------------------------------------------
    // Ambient light: warm midnight luxury
    const ambientLight = new THREE.AmbientLight(0xffecc2, 0.55);
    scene.add(ambientLight);

    // Warm golden boutique interior light (spills outside through open gates)
    const interiorLight = new THREE.PointLight(0xffdc88, 3.8, 30);
    interiorLight.position.set(0, 6.2, -6.5);
    interiorLight.castShadow = true;
    interiorLight.shadow.bias = -0.001;
    scene.add(interiorLight);

    // Facade & Signage Warm Spotlights
    const signLight = new THREE.SpotLight(0xffecb3, 4.5, 20, Math.PI / 3, 0.4, 1.2);
    signLight.position.set(0, 9.5, 9.5);
    signLight.target.position.set(0, 5.5, 0);
    scene.add(signLight);
    scene.add(signLight.target);

    // Street Lamps Outside (warm golden globes)
    const createStreetLamp = (x: number, z: number) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(x, 0, z);

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.16, 6.5, 12);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x111614,
        metalness: 0.9,
        roughness: 0.25,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3.25;
      lampGroup.add(pole);

      // Ornate bracket
      const bracketGeo = new THREE.TorusGeometry(0.6, 0.06, 8, 16, Math.PI);
      const bracketMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.3,
      });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(0, 6.1, 0);
      bracket.rotation.z = Math.PI / 2;
      lampGroup.add(bracket);

      // Glowing Lantern
      const lanternGeo = new THREE.OctahedronGeometry(0.4, 0);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe294 });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(0, 6.4, 0);
      lampGroup.add(lantern);

      // Light
      const pLight = new THREE.PointLight(0xffdf88, 2.0, 14);
      pLight.position.set(0, 6.4, 0);
      lampGroup.add(pLight);

      return lampGroup;
    };

    scene.add(createStreetLamp(-11, 16));
    scene.add(createStreetLamp(11, 16));

    // -------------------------------------------------------------
    // ROAD & OUTSIDE ENVIRONMENT (ASPHALT & SIDEWALK)
    // -------------------------------------------------------------
    // Asphalt Road
    const roadGeo = new THREE.PlaneGeometry(36, 26);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x121415,
      roughness: 0.72,
      metalness: 0.2,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.05, 20);
    road.receiveShadow = true;
    scene.add(road);

    // Road markings (white/gold dashed center lane)
    for (let z = 9; z <= 30; z += 4) {
      const dashGeo = new THREE.PlaneGeometry(0.25, 2.2);
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xe0d7cb });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, -0.03, z);
      scene.add(dash);
    }

    // Granite Sidewalk & Entrance Forecourt
    const sidewalkGeo = new THREE.BoxGeometry(28, 0.4, 10);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x221e1a,
      roughness: 0.6,
      metalness: 0.15,
    });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(0, 0.15, 6);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    // -------------------------------------------------------------
    // TWO SLEEK BLACK LUXURY CARS (PROCEDURAL 3D MESHES)
    // -------------------------------------------------------------
    const createLuxuryCar = (colorHex: number = 0x070707) => {
      const carGroup = new THREE.Group();

      // Obsidian Black Metallic Clearcoat Paint
      const carPaintMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.95,
        roughness: 0.16,
      });

      // Tinted Dark Glass
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x05080c,
        metalness: 0.98,
        roughness: 0.05,
      });

      // Chrome Trims
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        metalness: 0.96,
        roughness: 0.1,
      });

      // 1. Lower Body / Chassis
      const chassisGeo = new THREE.BoxGeometry(2.3, 0.65, 5.2);
      const chassis = new THREE.Mesh(chassisGeo, carPaintMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      carGroup.add(chassis);

      // 2. Sculpted Hood & Trunk
      const hoodGeo = new THREE.BoxGeometry(2.2, 0.28, 1.6);
      const hood = new THREE.Mesh(hoodGeo, carPaintMat);
      hood.position.set(0, 0.88, 1.4);
      carGroup.add(hood);

      // 3. Cabin & Sloping Roof
      const cabinGeo = new THREE.BoxGeometry(1.95, 0.72, 2.5);
      const cabin = new THREE.Mesh(cabinGeo, carPaintMat);
      cabin.position.set(0, 1.25, -0.2);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // 4. Windows (Windshield, Rear glass, side windows)
      const frontGlassGeo = new THREE.PlaneGeometry(1.8, 0.7);
      const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
      frontGlass.position.set(0, 1.25, 1.08);
      frontGlass.rotation.x = -Math.PI / 4;
      carGroup.add(frontGlass);

      const rearGlassGeo = new THREE.PlaneGeometry(1.8, 0.68);
      const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
      rearGlass.position.set(0, 1.25, -1.48);
      rearGlass.rotation.x = Math.PI / 3.8;
      carGroup.add(rearGlass);

      // Side Windows
      const sideGlassGeo = new THREE.BoxGeometry(2.02, 0.52, 2.0);
      const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
      sideGlass.position.set(0, 1.24, -0.2);
      carGroup.add(sideGlass);

      // 5. Front Luxury Chrome Grille
      const grilleGeo = new THREE.BoxGeometry(1.4, 0.45, 0.15);
      const grille = new THREE.Mesh(grilleGeo, chromeMat);
      grille.position.set(0, 0.65, 2.62);
      carGroup.add(grille);

      // 6. LED Headlights (Glowing)
      const headlightGeo = new THREE.BoxGeometry(0.45, 0.16, 0.1);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xe6f4ff });
      const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
      leftHeadlight.position.set(-0.85, 0.72, 2.61);
      carGroup.add(leftHeadlight);

      const rightHeadlight = leftHeadlight.clone();
      rightHeadlight.position.x = 0.85;
      carGroup.add(rightHeadlight);

      // Forward Headlight Beam on Road
      const headlightLight = new THREE.SpotLight(0xeaf4ff, 3.5, 15, Math.PI / 5, 0.5, 1.5);
      headlightLight.position.set(0, 0.8, 2.7);
      headlightLight.target.position.set(0, 0, 10);
      carGroup.add(headlightLight);
      carGroup.add(headlightLight.target);

      // 7. Ruby Red LED Taillights
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1525 });
      const taillightGeo = new THREE.BoxGeometry(2.1, 0.14, 0.08);
      const taillight = new THREE.Mesh(taillightGeo, taillightMat);
      taillight.position.set(0, 0.75, -2.61);
      carGroup.add(taillight);

      // 8. Wheels & Chrome Rims (4 wheels)
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 24);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
      });
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 16);

      const wheelPositions = [
        [-1.15, 0.38, 1.6],
        [1.15, 0.38, 1.6],
        [-1.15, 0.38, -1.6],
        [1.15, 0.38, -1.6],
      ];

      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(wx, wy, wz);
        wheelGroup.rotation.z = Math.PI / 2;

        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rim = new THREE.Mesh(rimGeo, chromeMat);
        wheelGroup.add(rim);

        carGroup.add(wheelGroup);
      });

      return carGroup;
    };

    // CAR 1: Parked on Left Road, angled towards the entrance
    const carLeft = createLuxuryCar(0x060809);
    carLeft.position.set(-6.8, 0, 17.5);
    carLeft.rotation.y = Math.PI * 0.12;
    scene.add(carLeft);

    // CAR 2: Parked on Right Road, sleek executive limousine stance
    const carRight = createLuxuryCar(0x050507);
    carRight.position.set(7.2, 0, 19.5);
    carRight.rotation.y = -Math.PI * 0.08;
    scene.add(carRight);

    // -------------------------------------------------------------
    // GRAND ARCHITECTURAL STOREFRONT & SIGNAGE
    // -------------------------------------------------------------
    const facadeGroup = new THREE.Group();
    facadeGroup.position.set(0, 0, 0);

    // Classical Stone Material (Warm Charcoal & Limestone)
    const facadeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1614,
      roughness: 0.65,
      metalness: 0.15,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
    });

    // Main Storefront Wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.8), facadeMat);
    wallLeft.position.set(-9.5, 5, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    facadeGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.8), facadeMat);
    wallRight.position.set(9.5, 5, 0);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    facadeGroup.add(wallRight);

    // Archway Above Gates
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 3.8, 1.2), facadeMat);
    archTop.position.set(0, 8.1, 0);
    archTop.castShadow = true;
    facadeGroup.add(archTop);

    // Fluted Classical Pillars flanking entrance
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 8.5, 24);
    const leftPillar = new THREE.Mesh(pillarGeo, facadeMat);
    leftPillar.position.set(-4.5, 4.25, 0.4);
    leftPillar.castShadow = true;
    facadeGroup.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 4.5;
    facadeGroup.add(rightPillar);

    // Golden Capitals on Pillars
    const capitalGeo = new THREE.BoxGeometry(1.4, 0.45, 1.4);
    const leftCap = new THREE.Mesh(capitalGeo, goldTrimMat);
    leftCap.position.set(-4.5, 8.4, 0.4);
    facadeGroup.add(leftCap);

    const rightCap = leftCap.clone();
    rightCap.position.x = 4.5;
    facadeGroup.add(rightCap);

    // Grand Entrance Arch Molding
    const crownMolding = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.65, 1.8), goldTrimMat);
    crownMolding.position.set(0, 9.8, 0.2);
    crownMolding.castShadow = true;
    facadeGroup.add(crownMolding);

    // Showcase Glass Windows on Left & Right Walls
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xfffae8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.5, 0.2), windowGlassMat);
    leftWindow.position.set(-8.5, 4.2, 0.4);
    facadeGroup.add(leftWindow);

    const rightWindow = leftWindow.clone();
    rightWindow.position.x = 8.5;
    facadeGroup.add(rightWindow);

    // -------------------------------------------------------------
    // ‘HOUSE OF SHRIYA’ ILLUMINATED LUXURY SIGNAGE
    // -------------------------------------------------------------
    const signTex = createSignageTexture();
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      metalness: 0.85,
      roughness: 0.2,
      emissive: new THREE.Color(0xd4af37),
      emissiveIntensity: 0.42,
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.05, 0.25), signMat);
    signBoard.position.set(0, 7.8, 0.65);
    signBoard.castShadow = true;
    facadeGroup.add(signBoard);

    // Signage Golden Backlight Halo Mesh
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd978,
      transparent: true,
      opacity: 0.22,
    });
    const signHalo = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 3.0), haloMat);
    signHalo.position.set(0, 7.8, 0.52);
    facadeGroup.add(signHalo);

    scene.add(facadeGroup);

    // -------------------------------------------------------------
    // LARGE ELEGANT ENTRANCE GATES (ORNATE JALI FILIGREE & GOLD)
    // -------------------------------------------------------------
    const jaliTex = createJaliGateTexture();
    const gateMat = new THREE.MeshStandardMaterial({
      map: jaliTex,
      metalness: 0.88,
      roughness: 0.28,
      bumpScale: 0.05,
    });
    const ironFrameMat = new THREE.MeshStandardMaterial({
      color: 0x141816,
      metalness: 0.92,
      roughness: 0.3,
    });

    const createGateWing = (isLeft: boolean) => {
      const wingGroup = new THREE.Group();
      // Outer hinge origin is at (0, 0, 0) of wingGroup
      const wWidth = 4.0;
      const wHeight = 6.2;

      // Gate Panel centered on hinge
      const panel = new THREE.Group();
      panel.position.x = isLeft ? wWidth / 2 : -wWidth / 2;

      // Inner Jali filigree screen
      const screenGeo = new THREE.BoxGeometry(wWidth - 0.2, wHeight - 0.2, 0.08);
      const screen = new THREE.Mesh(screenGeo, gateMat);
      screen.castShadow = true;
      panel.add(screen);

      // Heavy Iron Frame
      const frameGeo = new THREE.BoxGeometry(wWidth, wHeight, 0.16);
      const frame = new THREE.Mesh(frameGeo, ironFrameMat);
      panel.add(frame);

      // Gold Filigree Finials on top
      for (let fx = -wWidth / 2 + 0.3; fx <= wWidth / 2 - 0.3; fx += 0.5) {
        const finialGeo = new THREE.ConeGeometry(0.12, 0.5, 6);
        const finial = new THREE.Mesh(finialGeo, goldTrimMat);
        finial.position.set(fx, wHeight / 2 + 0.25, 0);
        panel.add(finial);
      }

      wingGroup.add(panel);
      return wingGroup;
    };

    const leftGate = createGateWing(true);
    leftGate.position.set(-4.0, 3.2, 0.2);
    scene.add(leftGate);

    const rightGate = createGateWing(false);
    rightGate.position.set(4.0, 3.2, 0.2);
    scene.add(rightGate);

    // -------------------------------------------------------------
    // BOUTIQUE INTERIOR (MARBLE FLOORS, GOLDEN WALLS, ARCHES)
    // -------------------------------------------------------------
    const interiorGroup = new THREE.Group();

    // Marble Floor
    const marbleTex = createMarbleTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      roughness: 0.18,
      metalness: 0.45,
    });
    const interiorFloor = new THREE.Mesh(new THREE.PlaneGeometry(28, 30), floorMat);
    interiorFloor.rotation.x = -Math.PI / 2;
    interiorFloor.position.set(0, 0, -14);
    interiorFloor.receiveShadow = true;
    interiorGroup.add(interiorFloor);

    // Ceiling with warm gold coving
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x181412,
      roughness: 0.8,
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(28, 30), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 8.5, -14);
    interiorGroup.add(ceiling);

    // Back wall of the boutique
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x1f1a17,
      roughness: 0.7,
      metalness: 0.1,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(28, 8.5, 0.5), backWallMat);
    backWall.position.set(0, 4.25, -28);
    interiorGroup.add(backWall);

    // Interior Arched Mirrors on Back Wall
    for (let mx = -8; mx <= 8; mx += 8) {
      const mirrorGeo = new THREE.BoxGeometry(3.6, 5.8, 0.1);
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xfff6dd,
        metalness: 0.95,
        roughness: 0.08,
      });
      const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
      mirror.position.set(mx, 4.5, -27.6);

      const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.9, 6.1, 0.15), goldTrimMat);
      mirrorFrame.position.set(mx, 4.5, -27.7);

      interiorGroup.add(mirrorFrame);
      interiorGroup.add(mirror);
    }

    // Side Walls
    const sideWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 30), backWallMat);
    sideWallLeft.position.set(-14, 4.25, -14);
    interiorGroup.add(sideWallLeft);

    const sideWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 30), backWallMat);
    sideWallRight.position.set(14, 4.25, -14);
    interiorGroup.add(sideWallRight);

    scene.add(interiorGroup);

    // -------------------------------------------------------------
    // CRYSTAL CHANDELIERS (WARM GOLDEN BOUTIQUE LIGHTING)
    // -------------------------------------------------------------
    const chandeliers: THREE.Group[] = [];
    const createChandelier = (x: number, y: number, z: number) => {
      const chGroup = new THREE.Group();
      chGroup.position.set(x, y, z);

      // Gold concentric rings
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 12, 32), goldTrimMat);
      ring1.rotation.x = Math.PI / 2;
      chGroup.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 12, 28), goldTrimMat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = -0.4;
      chGroup.add(ring2);

      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 12, 24), goldTrimMat);
      ring3.rotation.x = Math.PI / 2;
      ring3.position.y = -0.8;
      chGroup.add(ring3);

      // Hanging crystal teardrops
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0xfff9e6 });
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
        drop.position.set(Math.cos(a) * 1.6, -0.2, Math.sin(a) * 1.6);
        chGroup.add(drop);
      }

      // Center glowing point light
      const chLight = new THREE.PointLight(0xffdf88, 2.8, 12);
      chLight.position.y = -0.5;
      chGroup.add(chLight);

      return chGroup;
    };

    const ch1 = createChandelier(0, 7.2, -7);
    const ch2 = createChandelier(0, 7.2, -18);
    const chLeft = createChandelier(-7.5, 7.0, -12);
    const chRight = createChandelier(7.5, 7.0, -12);

    scene.add(ch1);
    scene.add(ch2);
    scene.add(chLeft);
    scene.add(chRight);
    chandeliers.push(ch1, ch2, chLeft, chRight);

    // -------------------------------------------------------------
    // STYLISH RACKS & HANGERS: INDIAN LADIES SUITS
    // (COTTON SUITS, DAILY WEAR SUITS, CO-ORD SETS)
    // -------------------------------------------------------------
    const rackItems: { group: THREE.Group; product: Product }[] = [];

    // Helper: Create a curved luxury garment rack
    const createGarmentRack = (title: string, x: number, z: number, rotationY: number) => {
      const rackGroup = new THREE.Group();
      rackGroup.position.set(x, 0, z);
      rackGroup.rotation.y = rotationY;

      // Base Stems & Crossbar (Brushed Gold / Brass)
      const barMat = goldTrimMat;
      const length = 5.6;
      const height = 3.2;

      // Base Feet
      const foot1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.2), barMat);
      foot1.position.set(-length / 2, 0.05, 0);
      rackGroup.add(foot1);

      const foot2 = foot1.clone();
      foot2.position.x = length / 2;
      rackGroup.add(foot2);

      // Vertical Uprights
      const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, height, 16);
      const pole1 = new THREE.Mesh(poleGeo, barMat);
      pole1.position.set(-length / 2, height / 2, 0);
      rackGroup.add(pole1);

      const pole2 = pole1.clone();
      pole2.position.x = length / 2;
      rackGroup.add(pole2);

      // Top Hanging Crossbar
      const crossbarGeo = new THREE.CylinderGeometry(0.04, 0.04, length, 16);
      const crossbar = new THREE.Mesh(crossbarGeo, barMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, height, 0);
      rackGroup.add(crossbar);

      // Elegant Rack Header Badge
      const badgeGeo = new THREE.BoxGeometry(2.4, 0.42, 0.08);
      const badgeCanvas = document.createElement("canvas");
      badgeCanvas.width = 512;
      badgeCanvas.height = 128;
      const bctx = badgeCanvas.getContext("2d");
      if (bctx) {
        bctx.fillStyle = "#0c110e";
        bctx.fillRect(0, 0, 512, 128);
        bctx.strokeStyle = "#d4af37";
        bctx.lineWidth = 4;
        bctx.strokeRect(6, 6, 500, 116);

        bctx.fillStyle = "#ffebad";
        bctx.font = "bold 32px 'Cinzel', serif";
        bctx.textAlign = "center";
        bctx.textBaseline = "middle";
        bctx.fillText(title, 256, 64);
      }
      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.position.set(0, height + 0.38, 0);
      rackGroup.add(badgeMesh);

      // Spotlight over this rack
      const rSpot = new THREE.SpotLight(0xffebb0, 2.4, 8, Math.PI / 4, 0.5);
      rSpot.position.set(0, height + 2.5, 1.2);
      rSpot.target.position.set(0, height / 2, 0);
      rackGroup.add(rSpot);
      rackGroup.add(rSpot.target);

      return { rackGroup, length, height };
    };

    // Helper: Create 3D Hanging Indian Ladies Suit (Anarkali, Kurta, Dupatta, Hanger)
    const createHangingSuit = (
      product: Product,
      suitColorHex: number,
      dupattaColorHex: number,
      styleType: "cotton" | "daily" | "coord" | "anarkali",
    ) => {
      const suitGroup = new THREE.Group();

      // Velvet / Wood Hanger with Gold Hook
      const hookGeo = new THREE.TorusGeometry(0.1, 0.015, 8, 16, Math.PI * 1.5);
      const hook = new THREE.Mesh(hookGeo, goldTrimMat);
      hook.position.y = 0.12;
      suitGroup.add(hook);

      const hangerBar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.06), goldTrimMat);
      suitGroup.add(hangerBar);

      // Fabric Material with subtle sheen
      const fabricMat = new THREE.MeshStandardMaterial({
        color: suitColorHex,
        roughness: styleType === "coord" ? 0.35 : 0.65,
        metalness: styleType === "coord" ? 0.3 : 0.08,
      });

      const dupattaMat = new THREE.MeshStandardMaterial({
        color: dupattaColorHex,
        roughness: 0.45,
        metalness: 0.15,
        transparent: true,
        opacity: 0.92,
      });

      const goldZariMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.25,
      });

      // 1. Kurta / Tunic Upper Body
      const torsoGeo = new THREE.BoxGeometry(0.72, 0.85, 0.16);
      const torso = new THREE.Mesh(torsoGeo, fabricMat);
      torso.position.y = -0.42;
      torso.castShadow = true;
      suitGroup.add(torso);

      // Neckline Zari Trim
      const neckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.18), goldZariMat);
      neckTrim.position.set(0, -0.22, 0);
      suitGroup.add(neckTrim);

      // 2. Skirt / Flare / Pants based on style
      if (styleType === "anarkali" || styleType === "cotton") {
        // Flared Anarkali / Kurti Ghera
        const flareGeo = new THREE.CylinderGeometry(0.36, 0.72, 1.4, 20, 1, true);
        const flare = new THREE.Mesh(flareGeo, fabricMat);
        flare.position.y = -1.45;
        flare.castShadow = true;
        suitGroup.add(flare);

        // Border lace
        const laceGeo = new THREE.CylinderGeometry(0.72, 0.73, 0.12, 20, 1, true);
        const lace = new THREE.Mesh(laceGeo, goldZariMat);
        lace.position.y = -2.1;
        suitGroup.add(lace);
      } else if (styleType === "coord") {
        // High-low Peplum Tunic & Wide Palazzo Pants
        const peplumGeo = new THREE.CylinderGeometry(0.36, 0.58, 0.65, 18, 1, true);
        const peplum = new THREE.Mesh(peplumGeo, fabricMat);
        peplum.position.y = -1.1;
        suitGroup.add(peplum);

        // Palazzo legs
        const legGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.3, 14);
        const leftLeg = new THREE.Mesh(legGeo, fabricMat);
        leftLeg.position.set(-0.2, -1.85, 0);
        suitGroup.add(leftLeg);

        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.2;
        suitGroup.add(rightLeg);
      } else {
        // Straight Fit Daily Wear Kurta & Cigarette Pants
        const straightGeo = new THREE.BoxGeometry(0.7, 1.1, 0.14);
        const straight = new THREE.Mesh(straightGeo, fabricMat);
        straight.position.y = -1.35;
        suitGroup.add(straight);

        // Slim Pants underneath
        const pantGeo = new THREE.BoxGeometry(0.48, 0.65, 0.12);
        const pants = new THREE.Mesh(pantGeo, dupattaMat);
        pants.position.y = -2.05;
        suitGroup.add(pants);
      }

      // 3. Graceful Draped Dupatta over one shoulder
      const dupattaGeo = new THREE.CylinderGeometry(0.12, 0.28, 2.2, 12);
      const dupatta = new THREE.Mesh(dupattaGeo, dupattaMat);
      dupatta.position.set(0.32, -1.1, 0.08);
      dupatta.rotation.z = -0.08;
      suitGroup.add(dupatta);

      // 4. Clickable Invisible Hitbox & Hover Tag
      const hitGeo = new THREE.BoxGeometry(1.1, 2.4, 0.6);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.y = -1.1;
      suitGroup.add(hitBox);

      // Gold Sparkle Tag above hanger
      const tagGeo = new THREE.OctahedronGeometry(0.08, 0);
      const tagMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
      const tag = new THREE.Mesh(tagGeo, tagMat);
      tag.position.y = 0.35;
      suitGroup.add(tag);

      return suitGroup;
    };

    // RACK 1: COTTON SUITS (Left Side Alcove)
    const { rackGroup: cottonRack, length: cLen, height: cHt } = createGarmentRack(
      "COTTON SUITS",
      -8.5,
      -11.5,
      Math.PI * 0.18,
    );
    scene.add(cottonRack);

    const cottonProducts = products.filter((p) => p.category === "Cotton Suits");
    const cottonColors = [
      { suit: 0x5a7a68, dup: 0xd69f7e, type: "cotton" as const }, // Sage & Terracotta
      { suit: 0x6e9075, dup: 0xedd6a6, type: "cotton" as const }, // Mint Gold
      { suit: 0x9b7e9b, dup: 0xf5e6d3, type: "cotton" as const }, // Pastel Lilac
      { suit: 0x3d6657, dup: 0xd4c29d, type: "cotton" as const }, // Sage Green
    ];

    cottonColors.forEach((cfg, idx) => {
      const prod = cottonProducts[idx] || products[0];
      const suit = createHangingSuit(prod, cfg.suit, cfg.dup, cfg.type);
      const spacing = cLen / (cottonColors.length + 1);
      suit.position.set(-cLen / 2 + (idx + 1) * spacing, cHt - 0.1, 0);
      cottonRack.add(suit);
      rackItems.push({ group: suit, product: prod });
    });

    // RACK 2: DAILY WEAR SUITS (Right Side Alcove)
    const { rackGroup: dailyRack, length: dLen, height: dHt } = createGarmentRack(
      "DAILY WEAR SUITS",
      8.5,
      -11.5,
      -Math.PI * 0.18,
    );
    scene.add(dailyRack);

    const dailyProducts = products.filter((p) => p.category === "Daily Wear Suits");
    const dailyColors = [
      { suit: 0x946b72, dup: 0xdfc5c7, type: "daily" as const }, // Dusty Rose
      { suit: 0xd2c0a6, dup: 0xfbf7ee, type: "daily" as const }, // Almond Ivory
      { suit: 0xbd6958, dup: 0x2e3d54, type: "daily" as const }, // Peach & Indigo
    ];

    dailyColors.forEach((cfg, idx) => {
      const prod = dailyProducts[idx] || products[1];
      const suit = createHangingSuit(prod, cfg.suit, cfg.dup, cfg.type);
      const spacing = dLen / (dailyColors.length + 1);
      suit.position.set(-dLen / 2 + (idx + 1) * spacing, dHt - 0.1, 0);
      dailyRack.add(suit);
      rackItems.push({ group: suit, product: prod });
    });

    // RACK 3: ETHNIC CO-ORD SETS (Center-Forward Lounge Display)
    const { rackGroup: coordRack, length: crLen, height: crHt } = createGarmentRack(
      "CO-ORD SETS",
      0,
      -14.8,
      0,
    );
    scene.add(coordRack);

    const coordProducts = products.filter((p) => p.category === "Co-ord Sets");
    const coordColors = [
      { suit: 0x0f4d38, dup: 0x22785a, type: "coord" as const }, // Royal Emerald
      { suit: 0xb52b57, dup: 0xdba1b4, type: "coord" as const }, // Rani Pink
      { suit: 0xc48625, dup: 0xe6b95c, type: "coord" as const }, // Saffron Marigold
    ];

    coordColors.forEach((cfg, idx) => {
      const prod = coordProducts[idx] || products[2];
      const suit = createHangingSuit(prod, cfg.suit, cfg.dup, cfg.type);
      const spacing = crLen / (coordColors.length + 1);
      suit.position.set(-crLen / 2 + (idx + 1) * spacing, crHt - 0.1, 0);
      coordRack.add(suit);
      rackItems.push({ group: suit, product: prod });
    });

    // -------------------------------------------------------------
    // INTERACTION & RAYCASTING (CLICK SUIT TO INSPECT)
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.lastMouseX = e.clientX;
      sceneRef.current.lastMouseY = e.clientY;
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!sceneRef.current || !sceneRef.current.isDragging) return;
      const deltaX = e.clientX - sceneRef.current.lastMouseX;
      const deltaY = e.clientY - sceneRef.current.lastMouseY;
      sceneRef.current.lastMouseX = e.clientX;
      sceneRef.current.lastMouseY = e.clientY;

      sceneRef.current.orbitAngleX -= deltaX * 0.005;
      sceneRef.current.orbitAngleY = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 4, sceneRef.current.orbitAngleY - deltaY * 0.004),
      );
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = false;

      // Check if it was a click (not a drag)
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check suits hit
      for (const item of rackItems) {
        const hits = raycaster.intersectObjects(item.group.children, true);
        if (hits.length > 0) {
          setSelectedSuit(item.product);
          playBoutiqueChime();
          break;
        }
      }
    };

    canvas.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    // -------------------------------------------------------------
    // ANIMATION & RENDER LOOP
    // -------------------------------------------------------------
    sceneRef.current = {
      scene,
      camera,
      renderer,
      leftGate,
      rightGate,
      interiorLight,
      chandeliers,
      rackItems,
      currentCamPos: camera.position.clone(),
      targetCamPos: initialPreset.pos.clone(),
      currentLookAt: initialPreset.target.clone(),
      targetLookAt: initialPreset.target.clone(),
      orbitAngleX: 0,
      orbitAngleY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
    };

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const sr = sceneRef.current;
      if (!sr) return;

      // 1. Smooth Camera Position & LookAt Lerp
      sr.currentCamPos.lerp(sr.targetCamPos, 0.05);
      sr.currentLookAt.lerp(sr.targetLookAt, 0.05);

      // Apply subtle orbit offset
      camera.position.x = sr.currentCamPos.x + Math.sin(sr.orbitAngleX) * 2.5;
      camera.position.y = Math.max(1.8, sr.currentCamPos.y + sr.orbitAngleY * 2.0);
      camera.position.z = sr.currentCamPos.z + (Math.cos(sr.orbitAngleX) - 1) * 2.5;
      camera.lookAt(sr.currentLookAt);

      // 2. Entrance Gate Opening Animation
      const targetLeftRot = gatesOpen ? -Math.PI * 0.46 : 0;
      const targetRightRot = gatesOpen ? Math.PI * 0.46 : 0;
      sr.leftGate.rotation.y = THREE.MathUtils.lerp(sr.leftGate.rotation.y, targetLeftRot, 0.06);
      sr.rightGate.rotation.y = THREE.MathUtils.lerp(sr.rightGate.rotation.y, targetRightRot, 0.06);

      // 3. Ambient Chandelier & Sparkle Sway
      sr.chandeliers.forEach((ch, idx) => {
        ch.rotation.y = Math.sin(time * 0.4 + idx) * 0.04;
      });

      // 4. Gentle Garment Hanger Sway
      sr.rackItems.forEach(({ group }, idx) => {
        group.rotation.z = Math.sin(time * 1.2 + idx * 0.7) * 0.015;
      });

      // 5. Interior golden light pulse
      sr.interiorLight.intensity = goldenLightIntensity === "radiant"
        ? 3.8 + Math.sin(time * 2.0) * 0.35
        : 2.4;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: nw, height: nh } = entry.contentRect;
        if (nw > 0 && nh > 0) {
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      renderer.dispose();
    };
  }, [goldenLightIntensity]);

  // Update camera target when preset changes
  useEffect(() => {
    const sr = sceneRef.current;
    if (!sr) return;
    const preset = viewPresets[currentView];
    if (preset) {
      sr.targetCamPos.copy(preset.pos);
      sr.targetLookAt.copy(preset.target);
      sr.orbitAngleX = 0;
      sr.orbitAngleY = 0;
    }
  }, [currentView, viewPresets]);

  // Switch to preset view
  const handleSelectView = (presetKey: ViewPreset) => {
    setCurrentView(presetKey);
    playBoutiqueChime();
    // Automatically open gates if transitioning to interior or racks
    if (["interior", "cotton", "daily", "coord"].includes(presetKey)) {
      setGatesOpen(true);
    }
  };

  const handleToggleGates = () => {
    const nextState = !gatesOpen;
    setGatesOpen(nextState);
    playBoutiqueChime();
    if (nextState && currentView === "storefront") {
      // Transition smoothly to gates view
      setCurrentView("gates");
    }
  };

  const handleEnterBoutique = () => {
    setGatesOpen(true);
    setCurrentView("interior");
    playBoutiqueChime();
  };

  const handleAddSuitToBag = (product: Product) => {
    addToCart(product, "M");
    playBoutiqueChime();
    setAddedNotice(`${product.name} added to your bag!`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none bg-[#090c0a] font-sans ${
        isFullScreenMode
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-[560px] md:h-[640px] rounded-2xl border border-[#2e3b33] shadow-2xl"
      }`}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* TOP STATUS BAR & BRAND HEADER */}
      <div className="absolute top-3 inset-x-3 md:inset-x-6 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2.5 bg-[#080e0c]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#d4af37]/40 shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
          <div className="flex items-center gap-1.5 font-serif text-[#faf8f5] text-xs font-bold tracking-wider uppercase">
            <Crown size={14} className="text-[#d4af37]" />
            <span>HOUSE OF SHRIYA</span>
            <span className="text-[#d4af37] font-sans font-normal text-[10px] hidden sm:inline">
              · 3D Haute Couture Boutique
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-[#080e0c]/80 border border-[#2b3a32] text-[#d4af37] flex items-center justify-center hover:bg-[#131f1a] transition-colors"
            title={isMuted ? "Unmute boutique chimes" : "Mute audio"}
            aria-label="Toggle audio"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* Golden Lighting Mood Toggle */}
          <button
            onClick={() => {
              setGoldenLightIntensity(goldenLightIntensity === "radiant" ? "warm" : "radiant");
              playBoutiqueChime();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#080e0c]/80 border border-[#d4af37]/40 text-[#f1dd9e] text-xs font-semibold hover:bg-[#131f1a] transition-all"
            title="Toggle Boutique Lighting Ambience"
          >
            <Sparkles size={13} className="text-[#d4af37]" />
            <span className="hidden sm:inline">
              {goldenLightIntensity === "radiant" ? "Radiant Gold" : "Warm Amber"}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="w-8 h-8 rounded-full bg-[#080e0c]/80 border border-[#2b3a32] text-[#e0d7cb] flex items-center justify-center hover:text-white transition-colors"
              title={isFullScreenMode ? "Exit Fullscreen" : "Enter Fullscreen Experience"}
              aria-label="Toggle full screen"
            >
              {isFullScreenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          {/* Close button if in modal/overlay */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#080e0c]/80 border border-[#2b3a32] text-[#e0d7cb] flex items-center justify-center hover:bg-[#b52b2b] hover:text-white transition-colors"
              aria-label="Close 3D Boutique"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* FLOATING ACTION PILL: OPEN GATES & STEP INSIDE */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto z-20 flex items-center gap-2">
        <button
          onClick={handleToggleGates}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-xl backdrop-blur-md ${
            gatesOpen
              ? "bg-[#0d1c16]/90 text-[#d4af37] border border-[#d4af37]/60 hover:bg-[#152e24]"
              : "bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#090d0b] border border-[#ffea9f] hover:brightness-110"
          }`}
        >
          <span>{gatesOpen ? "Close Entrance Gates" : "Open Grand Gates"}</span>
        </button>

        {!gatesOpen && currentView === "storefront" && (
          <button
            onClick={handleEnterBoutique}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#080e0c]/85 text-[#faf8f5] border border-[#2d3f36] text-xs font-semibold hover:border-[#d4af37] hover:text-[#d4af37] transition-all shadow-lg backdrop-blur-md"
          >
            <span>Step Inside Boutique</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* FLOATING HINT OVERLAY */}
      <div className="absolute top-16 right-4 hidden md:flex items-center gap-2 bg-[#080e0c]/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#24332b] text-[11px] text-[#a19c92] pointer-events-none">
        <Compass size={13} className="text-[#d4af37]" />
        <span>Drag to look around · Click garments to inspect</span>
      </div>

      {/* ADDED TO BAG TOAST NOTICE */}
      {addedNotice && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-[#0d4f3c] text-white px-5 py-2.5 rounded-full shadow-2xl border border-[#2ecc71]/40 flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check size={16} />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* BOTTOM VIEW PRESETS NAVIGATION DOCK */}
      <div className="absolute bottom-4 inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-20 pointer-events-auto">
        <div className="bg-[#090f0c]/90 backdrop-blur-md border border-[#2e3f36] p-1.5 rounded-2xl shadow-2xl flex items-center justify-between md:justify-center gap-1 overflow-x-auto max-w-full">
          <button
            onClick={() => handleSelectView("storefront")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "storefront"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span>Cars & Road</span>
          </button>

          <button
            onClick={() => handleSelectView("gates")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "gates"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span>Grand Gates</span>
          </button>

          <button
            onClick={() => handleSelectView("interior")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "interior"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span>Grand Hall</span>
          </button>

          <button
            onClick={() => handleSelectView("cotton")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "cotton"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#5a7a68]" />
            <span>Cotton Suits</span>
          </button>

          <button
            onClick={() => handleSelectView("daily")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "daily"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#946b72]" />
            <span>Daily Wear</span>
          </button>

          <button
            onClick={() => handleSelectView("coord")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentView === "coord"
                ? "bg-[#d4af37] text-[#090d0b] shadow-md"
                : "text-[#c2b9aa] hover:text-white hover:bg-[#131f1a]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0f4d38]" />
            <span>Co-ord Sets</span>
          </button>
        </div>
      </div>

      {/* SELECTED SUIT INSPECTION DRAWER */}
      {selectedSuit && (
        <div className="absolute right-3 bottom-16 md:bottom-4 md:right-6 z-30 w-[310px] sm:w-[340px] bg-[#0c1410]/95 backdrop-blur-xl border border-[#d4af37]/50 rounded-2xl p-4 shadow-2xl text-[#faf8f5] animate-in fade-in slide-in-from-right duration-300">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#24362d]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37] block">
                {selectedSuit.category}
              </span>
              <h4 className="font-serif font-bold text-sm text-white line-clamp-1">
                {selectedSuit.name}
              </h4>
            </div>
            <button
              onClick={() => setSelectedSuit(null)}
              className="text-[#999] hover:text-white p-1"
              aria-label="Close suit details"
            >
              <X size={15} />
            </button>
          </div>

          <div className="py-2.5 space-y-2 text-xs">
            <p className="text-[#bfb8ac] text-[11px] leading-relaxed line-clamp-2">
              {selectedSuit.description}
            </p>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#8c867b]">Fabric Composition:</span>
              <span className="font-semibold text-[#e5d4aa]">{selectedSuit.fabricType}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8c867b]">Color Tone:</span>
              <span className="font-semibold text-[#e5d4aa]">{selectedSuit.color}</span>
            </div>

            <div className="flex items-baseline gap-2 pt-1.5">
              <span className="font-serif text-lg font-bold text-[#f5d77f]">
                {selectedSuit.price}
              </span>
              {selectedSuit.originalPrice && (
                <span className="text-xs text-[#7d776d] line-through">
                  {selectedSuit.originalPrice}
                </span>
              )}
              {selectedSuit.savings && (
                <span className="text-[10px] font-bold text-[#2ecc71] bg-[#2ecc71]/10 px-1.5 py-0.5 rounded">
                  {selectedSuit.savings}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => handleAddSuitToBag(selectedSuit)}
              className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#090d0b] py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md"
            >
              <ShoppingBag size={14} />
              <span>Add to Bag</span>
            </button>

            {onEnterStorefront && (
              <button
                onClick={() => {
                  onEnterStorefront();
                }}
                className="px-3 py-2.5 bg-[#17251f] hover:bg-[#20332b] text-[#e0d7cb] rounded-xl text-xs font-semibold flex items-center justify-center"
                title="View Full Catalog"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
