import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';

console.log('Cubes loaded! Three.js version:', THREE.REVISION); // Debug: Confirms script runs

const COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff8800, 0xff00ff];
const SIZE = 5;
const CELL = 1.1;
let scene, camera, renderer, controls;
let cubes = [];
let selected = [];
let score = 0, level = 1, target = 1000;

init();
animate();

function init() {
  console.log('Init started'); // Debug
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  console.log('Renderer created, size:', renderer.domElement.width, 'x', renderer.domElement.height); // Debug

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;

  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(5, 10, 7);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  createCube();
  console.log('Cube created with', SIZE * SIZE * SIZE, 'cubes'); // Debug

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  document.getElementById('removeBtn').addEventListener('click', removeChain);
  console.log('Event listeners added'); // Debug
}

function createCube() {
  cubes = [];
  selected = [];
  for (let x = 0; x < SIZE; x++) {
    cubes[x] = [];
    for (let y = 0; y < SIZE; y++) {
      cubes[x][y] = [];
      for (let z = 0; z < SIZE; z++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          (x - SIZE / 2 + 0.5) * CELL,
          (y - SIZE / 2 + 0.5) * CELL,
          (z - SIZE / 2 + 0.5) * CELL
        );
        mesh.userData = { x, y, z, color, active: true };
        scene.add(mesh);
        cubes[x][y][z] = mesh;
      }
    }
  }
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX || e.touches?.[0]?.clientX) - rect.left) / rect.width * 2 - 1;
  const y = -((e.clientY || e.touches?.[0]?.clientY) - rect.top) / rect.height * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const cube = intersects[0].object;
    if (cube.userData?.active) selectCube(cube);
  }
}

function selectCube(cube) {
  if (!cube.userData.active) return;
  if (selected.includes(cube)) {
    if (selected.length >= 2) removeChain();
    return;
  }

  selected.forEach(c => c.material.emissive?.setHex(0x000000));
  selected = [cube];
  cube.material.emissive.setHex(0x555555);

  const toCheck = [cube];
  const color = cube.userData.color;
  const visited = new Set();

  while (toCheck.length) {
    const current = toCheck.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    selected.push(current);
    current.material.emissive.setHex(0x888888);

    const { x, y, z } = current.userData;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx || dy || dz) {
            const nx = x + dx, ny = y + dy, nz = z + dz;
            if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && nz >= 0 && nz < SIZE) {
              const neighbor = cubes[nx][ny][nz];
              if (neighbor && neighbor.userData.active && neighbor.userData.color === color && !visited.has(neighbor)) {
                toCheck.push(neighbor);
              }
            }
          }
        }
      }
    }
  }

  document.getElementById('removeBtn').disabled = selected.length < 2;
}

function removeChain() {
  if (selected.length < 2) return;

  const points = Math.pow(selected.length, selected.length - 1);
  score += points;
  document.getElementById('score').textContent = score;

  selected.forEach(c => {
    c.userData.active = false;
    c.material.transparent = true;
    c.material.opacity = 0.3;
  });

  applyGravity();

  selected = [];
  document.getElementById('removeBtn').disabled = true;

  if (score >= target) {
    level++;
    target = level * 1000 + 500;
    document.getElementById('level').textContent = level;
    document.getElementById('target').textContent = target;
  }
}

function applyGravity() {
  let fell = true;
  while (fell) {
    fell = false;
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        for (let y = 1; y < SIZE; y++) {
          const cube = cubes[x][y][z];
          const below = cubes[x][y - 1][z];
          if (cube.userData.active && !below.userData.active) {
            // Swap positions and data
            const tempUserData = cube.userData;
            const tempMaterial = cube.material;
            cube.userData = below.userData;
            cube.material = below.material;
            below.userData = tempUserData;
            below.material = tempMaterial;
            
            // Update array refs
            cubes[x][y][z] = below;
            cubes[x][y - 1][z] = cube;
            
            // Animate swap
            const tempY = cube.position.y;
            cube.position.y = below.position.y;
            below.position.y = tempY;
            
            fell = true;
          }
        }
      }
    }
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
