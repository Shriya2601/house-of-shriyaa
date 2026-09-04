import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface CinematicIntro3DProps {
  onComplete: () => void;
}

export default function CinematicIntro3D({ onComplete }: CinematicIntro3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // -------------------------------------------------------------
    // SCENE & RENDERER SETUP
    // -------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);
    scene.fog = new THREE.FogExp2(0x060809, 0.016);

    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(
      aspect < 1.0 ? Math.min(68, (44 / aspect) * 0.72) : 44,
      aspect,
      0.1,
      100,
    );

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // -------------------------------------------------------------
    // TEXTURES GENERATION (Signage, Marble, Reflective Street)
    // -------------------------------------------------------------
    // 1. "HOUSE OF SHRIYA" Illuminated Signage
    const createSignageTexture = () => {
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 1536;
      signCanvas.height = 384;
      const ctx = signCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(10, 12, 14, 0.96)";
        ctx.fillRect(0, 0, 1536, 384);

        ctx.strokeStyle = "rgba(218, 185, 106, 0.7)";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 1496, 344);

        // Royal Crown / Fleur-de-lis Motif
        ctx.fillStyle = "#e8c872";
        ctx.shadowColor = "rgba(232, 200, 114, 0.95)";
        ctx.shadowBlur = 24;
        ctx.beginPath();
        const cx = 768, cy = 90;
        ctx.moveTo(cx - 28, cy + 16);
        ctx.lineTo(cx - 20, cy - 14);
        ctx.lineTo(cx - 8, cy + 4);
        ctx.lineTo(cx, cy - 20);
        ctx.lineTo(cx + 8, cy + 4);
        ctx.lineTo(cx + 20, cy - 14);
        ctx.lineTo(cx + 28, cy + 16);
        ctx.closePath();
        ctx.fill();

        // Main Brand: HOUSE OF SHRIYA
        const grad = ctx.createLinearGradient(0, 120, 0, 250);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#fff5da");
        grad.addColorStop(0.7, "#edd185");
        grad.addColorStop(1, "#c59a42");

        ctx.fillStyle = grad;
        ctx.font = "bold 90px 'Cinzel', serif, Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "0.24em";
        ctx.shadowColor = "rgba(235, 198, 105, 0.95)";
        ctx.shadowBlur = 32;
        ctx.fillText("HOUSE OF SHRIYA", 768, 188);

        // Subtitle: HAUTE COUTURE ATELIER
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#edd295";
        ctx.font = "600 24px 'Plus Jakarta Sans', sans-serif";
        ctx.letterSpacing = "0.48em";
        ctx.fillText("HAUTE COUTURE · LADIES SUITS ATELIER", 768, 272);
      }
      const tex = new THREE.CanvasTexture(signCanvas);
      tex.anisotropy = 8;
      return tex;
    };

    // 2. Wet Reflective Asphalt Street Surface
    const createWetRoadTexture = () => {
      const roadCanvas = document.createElement("canvas");
      roadCanvas.width = 512;
      roadCanvas.height = 512;
      const ctx = roadCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a0c0e";
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 500; i++) {
          const rx = Math.random() * 512;
          const ry = Math.random() * 512;
          const rad = Math.random() * 50 + 15;
          ctx.fillStyle = "rgba(20, 24, 28, 0.4)";
          ctx.beginPath();
          ctx.arc(rx, ry, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const tex = new THREE.CanvasTexture(roadCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      return tex;
    };

    // 3. Italian Luxury Marble Floor
    const createMarbleFloorTexture = () => {
      const fCanvas = document.createElement("canvas");
      fCanvas.width = 512;
      fCanvas.height = 512;
      const ctx = fCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#e5decb";
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = "rgba(180, 160, 135, 0.45)";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 512, 512);
        ctx.strokeRect(20, 20, 472, 472);

        ctx.strokeStyle = "rgba(195, 175, 140, 0.35)";
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.bezierCurveTo(160, 240, 280, 90, 512, 340);
        ctx.stroke();

        ctx.strokeStyle = "rgba(215, 195, 160, 0.3)";
        ctx.beginPath();
        ctx.moveTo(70, 512);
        ctx.bezierCurveTo(220, 380, 310, 440, 512, 140);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(fCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 8);
      return tex;
    };

    // -------------------------------------------------------------
    // LIGHTING & ATELIER ATMOSPHERE
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.95);
    scene.add(ambientLight);

    // Warm Boutique Interior Key Glow
    const interiorMainGlow = new THREE.PointLight(0xffe6b0, 4.2, 28);
    interiorMainGlow.position.set(0, 4.8, -6.5);
    scene.add(interiorMainGlow);

    // Dedicated Overhead Spotlight on Ladies Suits Center Stage
    const centerStageSpot = new THREE.SpotLight(0xfff0c4, 6.0, 16, Math.PI / 3.2, 0.35);
    centerStageSpot.position.set(0, 5.8, -6.0);
    centerStageSpot.target.position.set(0, 1.2, -6.5);
    centerStageSpot.castShadow = true;
    scene.add(centerStageSpot);
    scene.add(centerStageSpot.target);

    // Entrance Portal Downlight
    const portalSpot = new THREE.SpotLight(0xffebb5, 5.0, 16, Math.PI / 3, 0.4);
    portalSpot.position.set(0, 5.6, 2.5);
    portalSpot.target.position.set(0, 0, 1.5);
    scene.add(portalSpot);
    scene.add(portalSpot.target);

    // Gold brass material
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.18,
    });

    // -------------------------------------------------------------
    // FLOATING GOLDEN ATELIER SPARKLE PARTICLES
    // -------------------------------------------------------------
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 16;
      particlePos[i * 3 + 1] = Math.random() * 4.5 + 0.3;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 6;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfde08b,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // -------------------------------------------------------------
    // EXTERIOR: WET REFLECTIVE STREET & SIDEWALK
    // -------------------------------------------------------------
    const roadTex = createWetRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.22,
      metalness: 0.7,
    });
    const street = new THREE.Mesh(new THREE.PlaneGeometry(42, 30), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0, 15);
    street.receiveShadow = true;
    scene.add(street);

    // Sidewalk Forecourt
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x22201e,
      roughness: 0.4,
      metalness: 0.35,
    });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(26, 0.24, 7), sidewalkMat);
    sidewalk.position.set(0, 0.12, 3.6);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    // -------------------------------------------------------------
    // TWO SLEEK BLACK LUXURY CARS PARKED IN PROFILE
    // -------------------------------------------------------------
    const createSleekBlackCar = (facingDirection: "left" | "right") => {
      const car = new THREE.Group();
      const carPaintMat = new THREE.MeshStandardMaterial({
        color: 0x070809,
        metalness: 0.96,
        roughness: 0.12,
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x050708,
        metalness: 0.98,
        roughness: 0.04,
      });
      const chromeTrimMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.96,
        roughness: 0.1,
      });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.52, 2.15), carPaintMat);
      chassis.position.y = 0.44;
      chassis.castShadow = true;
      car.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.58, 1.85), carPaintMat);
      cabin.position.set(-0.2, 0.95, 0);
      cabin.castShadow = true;
      car.add(cabin);

      const frontWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.72), glassMat);
      frontWindshield.position.set(1.1, 0.94, 0);
      frontWindshield.rotation.y = Math.PI / 2;
      frontWindshield.rotation.x = -Math.PI / 3.2;
      car.add(frontWindshield);

      const rearWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.78), glassMat);
      rearWindshield.position.set(-1.45, 0.94, 0);
      rearWindshield.rotation.y = -Math.PI / 2;
      rearWindshield.rotation.x = -Math.PI / 3.4;
      car.add(rearWindshield);

      const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.8), new THREE.MeshBasicMaterial({ color: 0xe6f4ff }));
      hlMesh.position.set(2.38, 0.52, 0);
      car.add(hlMesh);

      const tlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.95), new THREE.MeshBasicMaterial({ color: 0xff1620 }));
      tlMesh.position.set(-2.38, 0.56, 0);
      car.add(tlMesh);

      const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.3, 14);

      [
        [1.45, 0.36, 1.05],
        [1.45, 0.36, -1.05],
        [-1.45, 0.36, 1.05],
        [-1.45, 0.36, -1.05],
      ].forEach(([wx, wy, wz]) => {
        const wg = new THREE.Group();
        wg.position.set(wx, wy, wz);
        wg.rotation.x = Math.PI / 2;
        wg.add(new THREE.Mesh(tireGeo, tireMat));
        wg.add(new THREE.Mesh(rimGeo, chromeTrimMat));
        car.add(wg);
      });

      if (facingDirection === "left") car.rotation.y = Math.PI;
      return car;
    };

    const carLeft = createSleekBlackCar("right");
    carLeft.position.set(-5.6, 0, 9.8);
    carLeft.rotation.y = Math.PI * 0.08;
    scene.add(carLeft);

    const carRight = createSleekBlackCar("left");
    carRight.position.set(5.6, 0, 9.8);
    carRight.rotation.y = -Math.PI * 0.08;
    scene.add(carRight);

    // -------------------------------------------------------------
    // FACADE WITH GLOWING "HOUSE OF SHRIYA" SIGNAGE
    // -------------------------------------------------------------
    const buildingFacade = new THREE.Group();
    const facadeStoneMat = new THREE.MeshStandardMaterial({
      color: 0x1a1816,
      roughness: 0.65,
      metalness: 0.2,
    });

    const upperWall = new THREE.Mesh(new THREE.BoxGeometry(26, 5.2, 0.8), facadeStoneMat);
    upperWall.position.set(0, 8.8, 0);
    buildingFacade.add(upperWall);

    const signTex = createSignageTexture();
    const signBoardMat = new THREE.MeshStandardMaterial({
      map: signTex,
      metalness: 0.85,
      roughness: 0.2,
      emissive: new THREE.Color(0xd4af37),
      emissiveIntensity: 0.45,
    });

    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.6, 0.22), signBoardMat);
    signMesh.position.set(0, 5.25, 0.4);
    signMesh.castShadow = true;
    buildingFacade.add(signMesh);

    const signBorder = new THREE.Mesh(new THREE.BoxGeometry(6.85, 1.8, 0.14), goldMat);
    signBorder.position.set(0, 5.25, 0.3);
    buildingFacade.add(signBorder);

    scene.add(buildingFacade);

    // -------------------------------------------------------------
    // AUTOMATIC SLIDING GLASS DOORS
    // -------------------------------------------------------------
    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe8f4f2,
      metalness: 0.94,
      roughness: 0.06,
      transparent: true,
      opacity: 0.35,
    });

    const portalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 4.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x181a1a, metalness: 0.92, roughness: 0.2 }),
    );
    portalFrame.position.set(0, 2.2, 0.05);
    scene.add(portalFrame);

    const leftDoorGroup = new THREE.Group();
    const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(1.85, 4.15, 0.06), doorGlassMat);
    leftGlass.position.set(-0.95, 2.15, 0.05);
    leftDoorGroup.add(leftGlass);
    const leftDoorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.6, 12), goldMat);
    leftDoorHandle.position.set(-0.18, 2.0, 0.12);
    leftDoorGroup.add(leftDoorHandle);
    scene.add(leftDoorGroup);

    const rightDoorGroup = new THREE.Group();
    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(1.85, 4.15, 0.06), doorGlassMat);
    rightGlass.position.set(0.95, 2.15, 0.05);
    rightDoorGroup.add(rightGlass);
    const rightDoorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.6, 12), goldMat);
    rightDoorHandle.position.set(0.18, 2.0, 0.12);
    rightDoorGroup.add(rightDoorHandle);
    scene.add(rightDoorGroup);

    // -------------------------------------------------------------
    // LUXURIOUS BOUTIQUE INTERIOR (Italian Marble Flooring)
    // -------------------------------------------------------------
    const interior = new THREE.Group();
    const marbleTex = createMarbleFloorTexture();
    const marbleFloorMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      roughness: 0.12,
      metalness: 0.35,
    });
    const boutiqueFloor = new THREE.Mesh(new THREE.PlaneGeometry(26, 32), marbleFloorMat);
    boutiqueFloor.rotation.x = -Math.PI / 2;
    boutiqueFloor.position.set(0, 0, -16);
    boutiqueFloor.receiveShadow = true;
    interior.add(boutiqueFloor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 32),
      new THREE.MeshStandardMaterial({ color: 0x221f1c, roughness: 0.85 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6.2, -16);
    interior.add(ceiling);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(26, 6.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 0.7 }),
    );
    backWall.position.set(0, 3.1, -26);
    interior.add(backWall);

    // Backlit Warm Feature Arch
    const featureArch = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 5.2, 0.15),
      new THREE.MeshStandardMaterial({
        color: 0x332a22,
        roughness: 0.45,
        metalness: 0.3,
        emissive: new THREE.Color(0xd4af37),
        emissiveIntensity: 0.38,
      }),
    );
    featureArch.position.set(0, 2.8, -25.6);
    interior.add(featureArch);

    // Gilded Brand Emblem on back wall
    const backEmblem = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 0.06), signBoardMat);
    backEmblem.position.set(0, 4.5, -25.4);
    interior.add(backEmblem);

    // Multi-Tier Brass & Crystal Chandeliers
    const createChandelier = (zPos: number) => {
      const ch = new THREE.Group();
      ch.position.set(0, 5.4, zPos);

      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 32), goldMat);
      ringOuter.rotation.x = Math.PI / 2;
      ch.add(ringOuter);

      const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 24), goldMat);
      ringInner.rotation.x = Math.PI / 2;
      ringInner.position.y = -0.32;
      ch.add(ringInner);

      const chLight = new THREE.PointLight(0xffe3a4, 2.6, 14);
      chLight.position.y = -0.4;
      ch.add(chLight);

      return ch;
    };

    interior.add(createChandelier(-4.5));
    interior.add(createChandelier(-11.5));
    interior.add(createChandelier(-18.5));

    scene.add(interior);

    // -------------------------------------------------------------
    // STAR OF THE SCENE: HAUTE COUTURE LADIES SUITS PODIUM (CENTER ROTUNDA)
    // -------------------------------------------------------------
    const centerStage = new THREE.Group();
    centerStage.position.set(0, 0, -6.5);

    // Circular Calacatta Marble Platform with Brushed Gold Trim
    const stageRadius = 2.4;
    const stageGeo = new THREE.CylinderGeometry(stageRadius, stageRadius + 0.1, 0.18, 48);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0xf6f3ea,
      roughness: 0.15,
      metalness: 0.35,
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = 0.09;
    stageMesh.receiveShadow = true;
    centerStage.add(stageMesh);

    const stageGoldRim = new THREE.Mesh(
      new THREE.TorusGeometry(stageRadius + 0.06, 0.035, 12, 48),
      goldMat,
    );
    stageGoldRim.rotation.x = Math.PI / 2;
    stageGoldRim.position.y = 0.18;
    centerStage.add(stageGoldRim);

    // Warm Underglow Ring Light
    const stageGlowLight = new THREE.PointLight(0xffe8ad, 3.5, 8);
    stageGlowLight.position.set(0, 0.3, 0);
    centerStage.add(stageGlowLight);

    // -------------------------------------------------------------
    // FUNCTION TO CREATE DETAILED LADIES SUIT MANNEQUIN
    // -------------------------------------------------------------
    const createLadiesSuitMannequin = (
      kurtaHex: number,
      zariHex: number,
      dupattaHex: number,
      type: "anarkali" | "party" | "cotton",
    ) => {
      const mannequin = new THREE.Group();

      // Slender Gold Atelier Mannequin Stand
      const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 24), goldMat);
      standBase.position.y = 0.02;
      mannequin.add(standBase);

      const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 16), goldMat);
      standPole.position.y = 0.7;
      mannequin.add(standPole);

      // Fabric Materials
      const kurtaMat = new THREE.MeshStandardMaterial({
        color: kurtaHex,
        roughness: type === "party" ? 0.32 : type === "anarkali" ? 0.28 : 0.65,
        metalness: type === "party" ? 0.42 : type === "anarkali" ? 0.48 : 0.12,
      });

      const zariMat = new THREE.MeshStandardMaterial({
        color: zariHex,
        metalness: 0.95,
        roughness: 0.15,
      });

      const dupattaMat = new THREE.MeshStandardMaterial({
        color: dupattaHex,
        roughness: 0.38,
        metalness: 0.25,
        transparent: true,
        opacity: 0.92,
      });

      // Tailored Bodice / Choli
      const bodiceGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.52, 20);
      const bodice = new THREE.Mesh(bodiceGeo, kurtaMat);
      bodice.position.y = 1.32;
      bodice.castShadow = true;
      mannequin.add(bodice);

      // Mannequin Neck & Torso Finial
      const neckGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.16, 16);
      const neck = new THREE.Mesh(neckGeo, goldMat);
      neck.position.y = 1.64;
      mannequin.add(neck);

      const finialGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const finial = new THREE.Mesh(finialGeo, goldMat);
      finial.position.y = 1.76;
      finial.scale.set(0.9, 1.2, 0.9);
      mannequin.add(finial);

      // Intricate Embroidered Zari Neck Yoke
      const zariYoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.25), zariMat);
      zariYoke.position.set(0, 1.44, 0);
      mannequin.add(zariYoke);

      // Distinct Ladies Suit Silhouettes:
      if (type === "anarkali") {
        // 1. ROYAL BANARASI KATAN SILK ANARKALI SUIT:
        // Sweeping 24-kali flared skirt with heavy broad zari hem
        const ghera = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.88, 1.12, 32, 1, true),
          kurtaMat,
        );
        ghera.position.y = 0.74;
        ghera.castShadow = true;
        mannequin.add(ghera);

        // Broad Imperial Zari Brocade Hem
        const broadZariBorder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.88, 0.91, 0.24, 32, 1, true),
          zariMat,
        );
        broadZariBorder.position.y = 0.28;
        mannequin.add(broadZariBorder);

        // Elegant Translucent Draped Dupatta across shoulder
        const dupattaDrape = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.28, 1.55, 16),
          dupattaMat,
        );
        dupattaDrape.position.set(0.24, 0.95, 0.1);
        dupattaDrape.rotation.z = -0.16;
        mannequin.add(dupattaDrape);

        // Gold Kiran Dupatta Fringe
        const dupattaBorder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1.5, 12),
          zariMat,
        );
        dupattaBorder.position.set(0.36, 0.95, 0.14);
        mannequin.add(dupattaBorder);
      } else if (type === "party") {
        // 2. IMPERIAL VELVET & SILK PARTY-WEAR SUIT:
        // Kalidar silhouette with scalloped golden border
        const partyGhera = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.75, 1.05, 28, 1, true),
          kurtaMat,
        );
        partyGhera.position.y = 0.76;
        mannequin.add(partyGhera);

        const goldBorder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.77, 0.16, 28, 1, true),
          zariMat,
        );
        goldBorder.position.y = 0.32;
        mannequin.add(goldBorder);

        const dupattaLeft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.25, 1.45, 14),
          dupattaMat,
        );
        dupattaLeft.position.set(-0.22, 1.02, 0.08);
        dupattaLeft.rotation.z = 0.14;
        mannequin.add(dupattaLeft);
      } else {
        // 3. HANDLOOM CHANDERI & MULMUL PASTEL SUIT:
        // Flared tiers with shimmering gota patti borders
        const mulmulGhera = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.7, 0.65, 24, 1, true),
          kurtaMat,
        );
        mulmulGhera.position.y = 0.98;
        mannequin.add(mulmulGhera);

        const gotaTier1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.71, 0.06, 24, 1, true),
          zariMat,
        );
        gotaTier1.position.y = 0.68;
        mannequin.add(gotaTier1);

        const tier2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.68, 0.82, 0.5, 24, 1, true),
          kurtaMat,
        );
        tier2.position.y = 0.44;
        mannequin.add(tier2);

        const gotaTier2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.82, 0.83, 0.08, 24, 1, true),
          zariMat,
        );
        gotaTier2.position.y = 0.22;
        mannequin.add(gotaTier2);

        const dupattaSoft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.24, 1.4, 14),
          dupattaMat,
        );
        dupattaSoft.position.set(0.2, 1.0, 0.09);
        dupattaSoft.rotation.z = -0.12;
        mannequin.add(dupattaSoft);
      }

      return mannequin;
    };

    // 1. Center Flagship: Royal Emerald Banarasi Katan Silk Anarkali Suit
    const centerSuit = createLadiesSuitMannequin(
      0x0a4a30, // Deep Royal Emerald Green
      0xd4af37, // Golden Zari
      0xf3dfa2, // Translucent Gold Tissue Dupatta
      "anarkali",
    );
    centerSuit.position.set(0, 0.18, 0);
    centerStage.add(centerSuit);

    // 2. Left Flagship: Imperial Crimson Velvet & Silk Party-Wear Suit
    const leftSuit = createLadiesSuitMannequin(
      0x7a1528, // Royal Wine / Maroon
      0xe6c875, // Rich Antique Gold Zari
      0xdfb468, // Amber Gold Dupatta
      "party",
    );
    leftSuit.position.set(-1.15, 0.18, 0.2);
    leftSuit.rotation.y = Math.PI * 0.12;
    centerStage.add(leftSuit);

    // 3. Right Flagship: Handloom Chanderi & Mulmul Sage Pastel Suit
    const rightSuit = createLadiesSuitMannequin(
      0x4a7863, // Pastel Sage Mint
      0xf9ebc7, // Delicate Gota Patti
      0xfaf2de, // Sheer Ivory Dupatta
      "cotton",
    );
    rightSuit.position.set(1.15, 0.18, 0.2);
    rightSuit.rotation.y = -Math.PI * 0.12;
    centerStage.add(rightSuit);

    scene.add(centerStage);

    // -------------------------------------------------------------
    // SURROUNDING WARDROBE BAYS: 4 CURATED CATEGORIES ON HANGERS
    // -------------------------------------------------------------
    const createIndianSuitOnHanger = (
      kurtaColorHex: number,
      dupattaColorHex: number,
      type: "cotton" | "daily" | "party" | "coord",
    ) => {
      const suit = new THREE.Group();
      const hangerGroup = new THREE.Group();

      const hangerHook = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI * 1.4),
        goldMat,
      );
      hangerHook.position.set(0, 0.12, 0);
      hangerGroup.add(hangerHook);

      const hangerWoodMat = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.4,
        metalness: 0.2,
      });

      const shoulderLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.44, 12), hangerWoodMat);
      shoulderLeft.position.set(-0.19, -0.04, 0);
      shoulderLeft.rotation.z = Math.PI / 6.5;
      hangerGroup.add(shoulderLeft);

      const shoulderRight = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.44, 12), hangerWoodMat);
      shoulderRight.position.set(0.19, -0.04, 0);
      shoulderRight.rotation.z = -Math.PI / 6.5;
      hangerGroup.add(shoulderRight);

      const trouserBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.74, 12), goldMat);
      trouserBar.rotation.z = Math.PI / 2;
      trouserBar.position.set(0, -0.14, 0);
      hangerGroup.add(trouserBar);
      suit.add(hangerGroup);

      const kurtaMat = new THREE.MeshStandardMaterial({
        color: kurtaColorHex,
        roughness: type === "party" ? 0.35 : type === "coord" ? 0.45 : 0.68,
        metalness: type === "party" ? 0.38 : type === "coord" ? 0.22 : 0.08,
      });

      const dupattaMat = new THREE.MeshStandardMaterial({
        color: dupattaColorHex,
        roughness: 0.42,
        metalness: 0.18,
        transparent: true,
        opacity: 0.94,
      });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.14), kurtaMat);
      torso.position.y = -0.42;
      torso.castShadow = true;
      suit.add(torso);

      const zariNeck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.16), goldMat);
      zariNeck.position.set(0, -0.24, 0);
      suit.add(zariNeck);

      if (type === "cotton") {
        const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.68, 1.35, 18, 1, true), kurtaMat);
        flare.position.y = -1.4;
        suit.add(flare);
        const gotaBorder = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.69, 0.1, 18, 1, true), goldMat);
        gotaBorder.position.y = -2.02;
        suit.add(gotaBorder);
      } else if (type === "daily") {
        const straightKurta = new THREE.Mesh(new THREE.BoxGeometry(0.64, 1.15, 0.12), kurtaMat);
        straightKurta.position.y = -1.32;
        suit.add(straightKurta);
        const pants = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.1), dupattaMat);
        pants.position.y = -2.0;
        suit.add(pants);
      } else if (type === "party") {
        const anarkaliKalis = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.88, 1.6, 22, 1, true), kurtaMat);
        anarkaliKalis.position.y = -1.52;
        suit.add(anarkaliKalis);
        const broadZariHem = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.9, 0.22, 22, 1, true), goldMat);
        broadZariHem.position.y = -2.25;
        suit.add(broadZariHem);
      } else {
        const peplum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, 0.68, 16, 1, true), kurtaMat);
        peplum.position.y = -1.1;
        suit.add(peplum);
        const palazzoLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.3, 14), kurtaMat);
        palazzoLeft.position.set(-0.2, -1.82, 0);
        suit.add(palazzoLeft);
        const palazzoRight = palazzoLeft.clone();
        palazzoRight.position.x = 0.2;
        suit.add(palazzoRight);
      }

      const dupatta = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 2.1, 12), dupattaMat);
      dupatta.position.set(0.28, -1.15, 0.08);
      dupatta.rotation.z = -0.08;
      suit.add(dupatta);

      return suit;
    };

    const createBoutiqueWardrobeBay = (
      xPos: number,
      zPos: number,
      angleY: number,
      suits: { kurta: number; dup: number; type: "cotton" | "daily" | "party" | "coord" }[],
    ) => {
      const bay = new THREE.Group();
      bay.position.set(xPos, 0, zPos);
      bay.rotation.y = angleY;

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.7 });
      const backBayWall = new THREE.Mesh(new THREE.BoxGeometry(4.9, 4.4, 0.2), woodMat);
      backBayWall.position.set(0, 2.2, -0.6);
      bay.add(backBayWall);

      const topShelf = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.2, 1.2), woodMat);
      topShelf.position.set(0, 4.4, 0);
      bay.add(topShelf);

      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.4, 1.2), goldMat);
      leftPost.position.set(-2.45, 2.2, 0);
      bay.add(leftPost);

      const rightPost = leftPost.clone();
      rightPost.position.x = 2.45;
      bay.add(rightPost);

      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.7, 16), goldMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 3.8, 0);
      bay.add(rail);

      const rackSpot = new THREE.SpotLight(0xffebb5, 2.8, 8, Math.PI / 4, 0.45);
      rackSpot.position.set(0, 4.3, 0.3);
      rackSpot.target.position.set(0, 2.0, 0);
      bay.add(rackSpot);
      bay.add(rackSpot.target);

      const step = 4.4 / (suits.length + 1);
      suits.forEach((cfg, idx) => {
        const item = createIndianSuitOnHanger(cfg.kurta, cfg.dup, cfg.type);
        item.position.set(-2.2 + (idx + 1) * step, 3.7, 0);
        bay.add(item);
      });

      return bay;
    };

    // Left Wall Racks
    scene.add(
      createBoutiqueWardrobeBay(-5.6, -5.5, Math.PI * 0.14, [
        { kurta: 0x3d6651, dup: 0xdeb093, type: "cotton" },
        { kurta: 0x5b8a68, dup: 0xf5e3b8, type: "cotton" },
        { kurta: 0xa84f37, dup: 0xecd9c5, type: "cotton" },
      ]),
    );

    scene.add(
      createBoutiqueWardrobeBay(-5.6, -14.0, Math.PI * 0.12, [
        { kurta: 0x8a5b63, dup: 0xdfc5c7, type: "daily" },
        { kurta: 0xc4b299, dup: 0xfaf5ec, type: "daily" },
        { kurta: 0x2a394f, dup: 0xb55c4a, type: "daily" },
      ]),
    );

    // Right Wall Racks
    scene.add(
      createBoutiqueWardrobeBay(5.6, -5.5, -Math.PI * 0.14, [
        { kurta: 0x7a1829, dup: 0xd4af37, type: "party" },
        { kurta: 0x124734, dup: 0xe6b843, type: "party" },
        { kurta: 0x282352, dup: 0xdca6c8, type: "party" },
      ]),
    );

    scene.add(
      createBoutiqueWardrobeBay(5.6, -14.0, -Math.PI * 0.12, [
        { kurta: 0xb22552, dup: 0xdf9db3, type: "coord" },
        { kurta: 0x0f4d38, dup: 0x247d5e, type: "coord" },
        { kurta: 0xc4841f, dup: 0xe8b856, type: "coord" },
      ]),
    );

    // -------------------------------------------------------------
    // ATELIER WORKSTATION & INDIAN LADY WORKING AT BILLING DESK
    // -------------------------------------------------------------
    const checkoutArea = new THREE.Group();
    checkoutArea.position.set(0, 0, -20.2);

    const walnutDeskMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.7 });
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.15, 1.35), walnutDeskMat);
    counterBase.position.set(0, 0.575, 0);
    checkoutArea.add(counterBase);

    const counterGoldFlute = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.85, 0.05), goldMat);
    counterGoldFlute.position.set(0, 0.575, 0.69);
    checkoutArea.add(counterGoldFlute);

    const marbleTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.08, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xf8f4eb, roughness: 0.15, metalness: 0.45 }),
    );
    marbleTop.position.set(0, 1.19, 0);
    checkoutArea.add(marbleTop);

    // Desktop computer
    const compMetalMat = new THREE.MeshStandardMaterial({ color: 0x24282c, metalness: 0.9, roughness: 0.2 });
    const computerGroup = new THREE.Group();
    computerGroup.position.set(0.35, 1.23, 0.15);
    const screenChassis = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.55, 0.03), compMetalMat);
    screenChassis.position.set(0, 0.44, 0);
    computerGroup.add(screenChassis);

    const screenDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.51), new THREE.MeshBasicMaterial({ color: 0xbae8ff }));
    screenDisplay.position.set(0, 0.44, -0.02);
    screenDisplay.rotation.y = Math.PI;
    computerGroup.add(screenDisplay);
    checkoutArea.add(computerGroup);

    // Seated Indian Lady Stylist
    const woman = new THREE.Group();
    woman.position.set(0.35, 0, -0.62);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xbf8569, roughness: 0.6, metalness: 0.08 });
    const royalKurtiMat = new THREE.MeshStandardMaterial({ color: 0x7c152a, roughness: 0.45, metalness: 0.2 });
    const womanTorso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.24), royalKurtiMat);
    womanTorso.position.set(0, 0.95, 0);
    woman.add(womanTorso);

    const womanHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
    womanHead.position.set(0, 1.5, 0.04);
    womanHead.scale.set(0.9, 1.05, 0.95);
    woman.add(womanHead);

    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0x080706, roughness: 0.35, metalness: 0.15 }),
    );
    hairCrown.position.set(0, 1.54, 0.01);
    hairCrown.scale.set(0.95, 1.0, 1.02);
    woman.add(hairCrown);

    checkoutArea.add(woman);
    scene.add(checkoutArea);

    // -------------------------------------------------------------
    // EXACT 5-SECOND CINEMATIC DOLLY CAMERA ANIMATION
    // (Focusing on the 3D Ladies Suits Collection & Boutique Entrance)
    // -------------------------------------------------------------
    const TOTAL_DURATION = 5.0; // exactly 5.0 seconds
    const startTime = performance.now();
    let animationFrameId: number;

    // Spline Camera Track:
    // P0 (0.0s): Outside entrance looking at illuminated "HOUSE OF SHRIYA" and sliding glass doors
    // P1 (1.0s): Doors open, camera glides through threshold into the golden luxury interior
    // P2 (2.4s): Camera advances towards the center rotunda podium showcasing the flagship ladies suits
    // P3 (3.8s): Camera arcs gracefully in front of the ladies suits collection under the chandelier
    // P4 (5.0s): Wide, regal composition of the suits collection as smooth cross-fade completes
    const camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.72, 8.5),
      new THREE.Vector3(0, 1.68, 2.2),
      new THREE.Vector3(0.25, 1.6, -1.8),
      new THREE.Vector3(0.1, 1.52, -4.2),
      new THREE.Vector3(0, 1.5, -4.8),
    ]);

    const lookTargetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3.4, 0.4), // Looking at illuminated "HOUSE OF SHRIYA" signage
      new THREE.Vector3(0, 1.45, -6.5), // Focusing on ladies suits center stage
      new THREE.Vector3(0, 1.35, -6.5),
      new THREE.Vector3(0, 1.32, -6.5),
      new THREE.Vector3(0, 1.38, -6.5),
    ]);

    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);

      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(1.0, Math.max(0.0, elapsed / TOTAL_DURATION));

      // 1. Camera Motion along Spline
      const camPos = camCurve.getPointAt(progress);
      const lookPos = lookTargetCurve.getPointAt(progress);

      camera.position.copy(camPos);
      camera.lookAt(lookPos);

      // 2. Sliding Glass Doors Opening (0.15 to 0.45 progress, ~0.75s to 2.2s)
      let doorProgress = 0;
      if (progress >= 0.15 && progress <= 0.45) {
        doorProgress = (progress - 0.15) / (0.45 - 0.15);
      } else if (progress > 0.45) {
        doorProgress = 1.0;
      }
      const smoothSlide = doorProgress * doorProgress * (3 - 2 * doorProgress);
      leftDoorGroup.position.x = -smoothSlide * 1.8;
      rightDoorGroup.position.x = smoothSlide * 1.8;

      // 3. Subtle Gentle Float of Atelier Particles
      const pPositions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3 + 1] -= 0.003;
        if (pPositions[i * 3 + 1] < 0.2) {
          pPositions[i * 3 + 1] = 4.8;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // 4. Subtle rotation on the flagship ladies suits center podium
      centerStage.rotation.y = Math.sin(elapsed * 0.5) * 0.08;

      renderer.render(scene, camera);

      // 5. Smooth Dissolve Transition into Homepage (starting at 4.2s)
      if (elapsed >= TOTAL_DURATION - 0.8 && !isFadingOut) {
        setIsFadingOut(true);
      }

      // 6. Complete at exactly 5.0 seconds
      if (elapsed >= TOTAL_DURATION) {
        cancelAnimationFrame(animationFrameId);
        onComplete();
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    // Responsive Resize Listener (Mobile & Desktop)
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const newAspect = width / height;
      camera.aspect = newAspect;
      camera.fov = newAspect < 1.0 ? Math.min(68, (44 / newAspect) * 0.72) : 44;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [onComplete, isFadingOut]);

  // Click or touch anywhere to dismiss early with smooth 280ms transition
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 280);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleSkip}
      onTouchStart={handleSkip}
      className={`fixed inset-0 z-50 w-screen h-screen bg-[#050608] cursor-pointer select-none transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="House of Shriya 3D Ladies Suits Collection Opening Animation"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
