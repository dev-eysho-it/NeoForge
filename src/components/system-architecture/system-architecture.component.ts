import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';

interface SystemNode {
  pos: THREE.Vector3;
  shape: 'Box' | 'Sphere' | 'Icosahedron' | 'Torus' | 'Octahedron' | 'Cylinder';
  label: string;
  description: string;
  color: number;
  size?: number;
  active?: boolean;
}

@Component({
  selector: 'app-system-architecture',
  templateUrl: './system-architecture.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // FIX: Added imports to make this a standalone component, as it's used in another standalone component.
  imports: [CommonModule],
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class SystemArchitectureComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') private containerRef!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private labelRenderer!: CSS2DRenderer;
  private controls!: OrbitControls;
  private frameId: number | null = null;
  private activeNodes: THREE.Mesh[] = [];
  private lines: THREE.Line[] = [];
  private disposables: (() => void)[] = [];

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private activeTooltip: CSS2DObject | null = null;
  private nodeMeshes: THREE.Mesh[] = [];

  constructor() {}

  ngAfterViewInit(): void {
    this.initThree();
    this.createArchitecture();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    this.disposables.forEach(d => d());
  }

  private onResize(): void {
    if (!this.camera || !this.renderer || !this.labelRenderer || !this.composer) return;

    const width = this.containerRef.nativeElement.clientWidth;
    const height = this.containerRef.nativeElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  private initThree(): void {
    const container = this.containerRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 30;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    container.appendChild(this.labelRenderer.domElement);
    this.disposables.push(() => container.removeChild(this.labelRenderer.domElement));

    this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
    this.controls.enableDamping = true;
    this.disposables.push(() => this.controls.dispose());

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight.position.set(0, 0, 10);
    this.scene.add(pointLight);

    // Post-processing for Ambient Occlusion
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const saoPass = new SAOPass(this.scene, this.camera);
    saoPass.params.saoBias = 0.5;
    saoPass.params.saoIntensity = 0.025;
    saoPass.params.saoScale = 2.5;
    saoPass.params.saoKernelRadius = 60;
    saoPass.params.saoBlur = true;
    this.composer.addPass(saoPass);

    this.labelRenderer.domElement.addEventListener('click', this.onClick);
    this.disposables.push(() => this.labelRenderer.domElement.removeEventListener('click', this.onClick));
  }
  
  private createNodeMesh(nodeInfo: SystemNode): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    const baseSize = nodeInfo.size || 1;
    const size = baseSize * 1.2;
    switch(nodeInfo.shape) {
        case 'Box': geometry = new THREE.BoxGeometry(size*1.5, size*1.5, size*1.5); break;
        case 'Sphere': geometry = new THREE.SphereGeometry(size, 32, 16); break;
        case 'Icosahedron': geometry = new THREE.IcosahedronGeometry(size * 1.5); break;
        case 'Torus': geometry = new THREE.TorusGeometry(size, size * 0.4, 16); break;
        case 'Octahedron': geometry = new THREE.OctahedronGeometry(size); break;
        case 'Cylinder': geometry = new THREE.CylinderGeometry(size*0.8, size*0.8, size*2, 32); break;
    }

    const material = new THREE.MeshStandardMaterial({
        color: nodeInfo.color,
        emissive: nodeInfo.active ? 0x00ffff : 0x000000,
        emissiveIntensity: nodeInfo.active ? 1 : 0,
        metalness: 0.3,
        roughness: 0.6,
    });
    
    this.disposables.push(() => geometry.dispose(), () => material.dispose());
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(nodeInfo.pos);
    return mesh;
  }
  
  private createLabel(text: string, position: THREE.Vector3): CSS2DObject {
      const div = document.createElement('div');
      div.className = 'text-cyan-300 font-mono text-xs bg-black/50 px-2 py-1 rounded pointer-events-none';
      div.textContent = text;
      
      const label = new CSS2DObject(div);
      label.position.copy(position);
      label.position.y += 1.5;
      return label;
  }

  private createArchitecture(): void {
    const nodes: { [key: string]: SystemNode } = {
        'core': { pos: new THREE.Vector3(0, 0, 0), shape: 'Icosahedron', label: 'NeuroForge Core', description: 'The central processing unit of the NeuroForge platform, orchestrating all plugin and data flow operations.', color: 0x8A2BE2, size: 2, active: true },
      
        'angular': { pos: new THREE.Vector3(-12, 6, 0), shape: 'Sphere', label: 'Angular', description: 'Frontend framework for the dashboard UI, providing a reactive and component-based structure.', color: 0xDD0031, active: true },
        'rxjs': { pos: new THREE.Vector3(-15, 9, 0), shape: 'Sphere', label: 'RxJS', description: 'Reactive programming library for managing asynchronous data streams and events.', color: 0xE501A9 },
        'threejs': { pos: new THREE.Vector3(-18, 6, 0), shape: 'Sphere', label: 'Three.js', description: '3D graphics library for rendering the interactive system architecture visualization.', color: 0xffffff },
      
        'rust': { pos: new THREE.Vector3(12, 6, 0), shape: 'Box', label: 'Rust', description: 'High-performance, memory-safe language used for the backend services, ensuring reliability and speed.', color: 0xDEA584, active: true },
        'actix': { pos: new THREE.Vector3(15, 9, 0), shape: 'Box', label: 'Actix-Web', description: 'Powerful, pragmatic, and extremely fast web framework for the Rust backend.', color: 0x808080 },
  
        'sqlx': { pos: new THREE.Vector3(12, -6, 0), shape: 'Torus', label: 'SQLx', description: 'Asynchronous, compile-time checked SQL toolkit for Rust, interacting with the primary database.', color: 0x336791 },
        'redis': { pos: new THREE.Vector3(15, -9, 0), shape: 'Torus', label: 'Redis', description: 'In-memory data store used for caching, session management, and real-time messaging.', color: 0xDC382D },
        'qdrant': { pos: new THREE.Vector3(18, -6, 0), shape: 'Torus', label: 'Qdrant', description: 'Vector database for high-dimensional similarity search, powering AI-driven features.', color: 0xAC322C },
  
        'docker': { pos: new THREE.Vector3(-12, -6, 0), shape: 'Octahedron', label: 'Docker', description: 'Containerization platform for packaging and deploying all services in isolated environments.', color: 0x2496ED, active: true },
        'nginx': { pos: new THREE.Vector3(-15, -9, 0), shape: 'Octahedron', label: 'Nginx', description: 'High-performance web server and reverse proxy, handling ingress traffic and load balancing.', color: 0x269539 },
      
        'prometheus': { pos: new THREE.Vector3(0, 12, 0), shape: 'Cylinder', label: 'Prometheus', description: 'Monitoring system and time series database for collecting metrics and alerting.', color: 0xE6522C, active: true },
        'grafana': { pos: new THREE.Vector3(4, 15, 0), shape: 'Cylinder', label: 'Grafana', description: 'Analytics and visualization web application for displaying monitoring data from Prometheus.', color: 0xF46800 },
        'jaeger': { pos: new THREE.Vector3(-4, 15, 0), shape: 'Cylinder', label: 'Jaeger', description: 'Distributed tracing system for monitoring and troubleshooting microservices-based architectures.', color: 0x5194E2 },
    };

    const nodeMap: Map<string, THREE.Mesh> = new Map();
    this.nodeMeshes = [];

    for (const key in nodes) {
      const nodeInfo = nodes[key];
      const mesh = this.createNodeMesh(nodeInfo);
      mesh.userData.nodeInfo = nodeInfo;
      const label = this.createLabel(nodeInfo.label, nodeInfo.pos);
      
      this.scene.add(mesh);
      mesh.add(label);
      nodeMap.set(key, mesh);
      this.nodeMeshes.push(mesh);

      if (nodeInfo.active) {
        this.activeNodes.push(mesh);
      }
    }
    
    const connections = [
        ['angular', 'rxjs'], ['angular', 'threejs'], ['angular', 'core'],
        ['rust', 'actix'], ['rust', 'core'],
        ['sqlx', 'rust'], ['redis', 'rust'], ['qdrant', 'rust'],
        ['docker', 'angular'], ['docker', 'rust'], ['docker', 'nginx'], ['docker', 'core'],
        ['prometheus', 'core'], ['prometheus', 'grafana'], ['prometheus', 'jaeger']
    ];
    
    this.lines = [];
    connections.forEach(([startKey, endKey]) => {
        const startNode = nodeMap.get(startKey);
        const endNode = nodeMap.get(endKey);
        if (startNode && endNode) {
            const points = [startNode.position, endNode.position];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const material = new THREE.LineDashedMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                dashSize: 0.5,
                gapSize: 0.25,
            });

            this.disposables.push(() => geometry.dispose(), () => material.dispose());

            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();

            this.scene.add(line);
            this.lines.push(line);
        }
    });
  }

  private createTooltip(nodeInfo: SystemNode, parentMesh: THREE.Mesh): void {
    const div = document.createElement('div');
    div.className = 'bg-black/80 border border-purple-500/50 p-3 rounded-md shadow-lg text-white font-mono text-xs max-w-xs backdrop-blur-sm pointer-events-none';
    
    const title = document.createElement('h4');
    title.className = 'font-orbitron text-cyan-300 text-sm mb-1';
    title.textContent = nodeInfo.label;
    
    const description = document.createElement('p');
    description.className = 'text-gray-300';
    description.textContent = nodeInfo.description;
    
    div.appendChild(title);
    div.appendChild(description);

    const tooltip = new CSS2DObject(div);
    
    parentMesh.geometry.computeBoundingSphere();
    const yOffset = (parentMesh.geometry.boundingSphere?.radius ?? 1) + 0.5;
    tooltip.position.set(0, yOffset, 0);

    parentMesh.add(tooltip);
    this.activeTooltip = tooltip;
  }

  private onClick = (event: MouseEvent): void => {
    event.preventDefault();

    if (!this.containerRef?.nativeElement) return;

    const { top, left, width, height } = this.containerRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - left) / width) * 2 - 1;
    this.mouse.y = -((event.clientY - top) / height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.nodeMeshes);

    if (this.activeTooltip) {
      this.activeTooltip.parent?.remove(this.activeTooltip);
      this.activeTooltip = null;
    }
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      const nodeInfo = clickedObject.userData.nodeInfo as SystemNode;
      if (nodeInfo) {
        this.createTooltip(nodeInfo, clickedObject);
      }
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    const time = Date.now() * 0.0025;
    this.activeNodes.forEach(node => {
        const material = node.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = (Math.sin(time) + 1.5) / 2 * 0.8 + 0.2; // pulse
    });

    const lineTime = Date.now() * -0.0003;
    this.lines.forEach(line => {
      const material = line.material as THREE.LineDashedMaterial;
      material.dashOffset = lineTime;
    });

    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  };
}