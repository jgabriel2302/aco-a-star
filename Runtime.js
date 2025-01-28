/* 
############################################################################################
####		Created & Developed by João Gabriel Corrêa da Silva (All Rights Reserved)				####
####	    https://www.linkedin.com/in/jo%C3%A3o-gabriel-corr%C3%AAa-da-silva/	          ####
############################################################################################
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
//import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

class ObjectInfo {
  static TYPES = {
    DEPOSITO: 0,
    ENTREGA: 1
  }
  constructor(type = ObjectInfo.TYPES.DEPOSITO, defaultValue = -1){
    this.type = type;
    this.value = defaultValue;
  }
}

class _ObjectType {
  constructor(mesh){
    this.mesh = mesh;
    this.name = mesh.name;
    const geometry = this.mesh.geometry;
    const centerVector = new THREE.Vector3();

    geometry.computeBoundingBox();
    const y = geometry.boundingBox.min.y;
    geometry.boundingBox.getCenter(centerVector).negate();
    geometry.translate(centerVector.x, -y, centerVector.z);

    this._thumbnail = null;
  }

  get thumbnail(){
    if(this._thumbnail === null){
      this._thumbnail = createObjectThumb(200, 200, this);
    }
    return this._thumbnail;
  }

  instatiate(scene){
    const cMesh = this.mesh.clone(true);
    scene.add(cMesh);
    return cMesh;
  }
}

class VehicleType extends _ObjectType {
}

class BuildingType extends _ObjectType  {
  constructor(mesh, name){
    super(mesh);
    this.name = name;
  }
}

class ModelLoader {
  static load(objPath, mtlPath) {
    return new Promise((resolve, reject) => {
      const objLoader = new OBJLoader();
      const mtlLoader = new MTLLoader();
      mtlLoader.load(mtlPath, (mtl)=>{
        mtl.preload();
        objLoader.setMaterials(mtl);
        objLoader.load(objPath, (obj)=>{
          resolve(obj, mtl);
        })
      });
    })
  }
}

class HexGrid {
  constructor(ThreeJSScene, ThreeJSCamera, rows = 10, cols = 10){
    this.scene = ThreeJSScene;
    this.camera = ThreeJSCamera;
    this.rows = rows;
    this.cols = cols;
    this.grid = this.generateHexGrid(this.rows, this.cols, 20);
    this.selectedIndex = -1;
    let camSize = 10;

    let light = new THREE.DirectionalLight(0xffffff, 1.5);
      light.position.set(100, -50, 50);
      light.castShadow = true;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 250;

      light.shadow.camera.left = -camSize;
      light.shadow.camera.bottom = -camSize;
      light.shadow.camera.right = camSize;
      light.shadow.camera.top = camSize;

      this.scene.add(light);
      this.scene.add(new THREE.AmbientLight(0xffffff, 1));
  }

  generateHexGrid(rows, cols, hexSize) {
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;
    const xOffset = hexWidth * 0.75;
    const yOffset = hexHeight;
    const hexes = [];

    const centerX = cols * hexWidth / 2
    const centerY = rows * hexHeight / 2

    let index = 0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * xOffset - centerX;
            const y = row * yOffset + (col % 2 === 0 ? 0 : hexHeight / 2) - centerY;
            const h = Math.floor( Math.random() * 5 + 10 );
            const hexagon = this.createHexagon(hexSize, h, 0xdddddd, index+"");
            hexagon.position.set(x, 0, y);
            hexagon.name = `hexagon_${index}_${row}_${col}`;
            hexagon.userData = {
              row: row,
              col: col,
              index: index
            }
            this.scene.add(hexagon);
            hexes.push({
              x,
              y,
              h: h * 1.25,
              hexagon,
              material: hexagon.material,
              row,
              col,
              index,
              filled: false,
              object: null
            });
            index++;
        }
    }

    return hexes;
  }

  createHexagon(size, height, color, index) {
    // Criar a forma do hexágono
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
        const angle = (i / 6) * Math.PI * 2; // Dividir 360° em 6 partes
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) shape.moveTo(x, y); // Primeiro ponto
        else shape.lineTo(x, y); // Conectar os outros pontos
    }

    const extrudeSettings = { depth: height, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.5, bevelOffset: 0, bevelSegments: 5};

    // Criar a geometria e o material
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });

    geometry.center();
    // Criar o mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;

    // if(index !== undefined) TextMesh.create(index, {size: 3, bevelEnabled: false}).then(text=>{
    //   text.rotation.x -= Math.PI / 2;
    //   text.rotation.y += Math.PI / 2;
    //   text.position.z -= height * 2.1;
    //   mesh.add(text)
    // });

    return mesh;
  }

  highlight(index = -1){
    this.selectedIndex = -1;
    if(!this.grid[index]) return;
    this.selectedIndex = index;
    for (let i = 0; i < this.grid.length; i++) {
      const hex = this.grid[i].hexagon;
      const highlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      hex.material = i===index? highlightMaterial: this.grid[i].material;
    }    
  }

  getSelected(){
    return this.grid[this.selectedIndex] ?? false;
  }

  clearSelected(){
    if(!this.grid[this.selectedIndex]) return;
    if(!this.grid[this.selectedIndex].object) return;
    if(!this.grid[this.selectedIndex].object.removeFromParent) return;
    this.grid[this.selectedIndex].object.removeFromParent();
    this.grid[this.selectedIndex].filled = false;
    this.grid[this.selectedIndex].object = null;
  }

  fillSelected(object = {}){
    if(!this.grid[this.selectedIndex]) return;
    this.grid[this.selectedIndex].filled = true;
    this.grid[this.selectedIndex].object = object;
  }

  output(){
    const relevant = this.grid.filter(x=>x.filled);

    const indexes = [...relevant].map(x=>x.index);

    const cities = Array.from({ length: relevant.length }, ()=>Array.from({ length: relevant.length }, ()=>0) );
    const map = Array.from({ length: this.rows }, ()=>Array.from({ length: this.cols }, ()=>0) );

    for (let r = 0; r < relevant.length; r++) {
      for (let c = 0; c < relevant.length; c++) {
        const a = relevant[r];
        const b = relevant[c];
        cities[r][c] = a.hexagon.position.distanceTo(b.hexagon.position);
      }
    }

    const mapControl = { index: 0 };
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        map[r][c] = { occupied: false, cost: 1, index: mapControl.index };
        mapControl.index++;
        //map[r][c].occupied = relevant.find(x=>x.col === c && x.row === r) !== undefined;
      }
    }

    const demands =  Array.from({ length: relevant.length }, (v, i)=>{
      if(!relevant[i].filled) return 0;
      const data = relevant[i].object.userData;
      return data.type === ObjectInfo.TYPES.DEPOSITO? 0: data.value;
    });

    const depots = [...relevant].map((x, i)=>({...x, index: i})).filter(x=>!x.filled? false: x.object.userData.type === ObjectInfo.TYPES.DEPOSITO).map(x=>x.index);

    return {
      cities,
      demands,
      depots,
      indexes,
      map
    } 
  }

  routeToPosition(routeIndexes = []){
    return routeIndexes.map(index=>this.grid[index]).map(x=>x.hexagon.position.clone());
  }
}

class TextMesh {
  static font = null;
  static loadFont(){
    return new Promise((resolve, reject) => {
      const loader = new FontLoader();
      if(TextMesh.font !== null) return resolve(TextMesh.font);
      loader.load( 'https://raw.githubusercontent.com/mrdoob/three.js/refs/heads/master/examples/fonts/optimer_regular.typeface.json', function ( font ) {
        TextMesh.font = font;
        resolve(font);
      })
    })
  }
  static create(_text = "", options = {}){
    return new Promise(async (resolve, reject)=>{
      const font = await TextMesh.loadFont();
      const textGeometry = new TextGeometry( _text, {
        font,
        size: 10,
        depth: 1,
        curveSegments: 1,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelOffset: 0,
        bevelSegments: 5,
        ...options
      } );
      textGeometry.center();
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
      const text = new THREE.Mesh(textGeometry, textMaterial);
      resolve(text)
    })
  }
}

class CircularMenu {
  static create(items = '', targetId, closeCallback = ()=>false){
    const step = Math.PI * 2 / items.length;
    const radius = 100;
    const menu = document.createElement('div');
    const menuContainer = document.createElement('span');

    const close = ()=>{
      menu.classList.add('closing')
      setTimeout(()=>{
        menu.parentNode.removeChild(menu);
      }, 300 + items.length * 100);
      closeCallback();
    }

    const interaction = { 
      tabIndex: -1, 
      key: (e, action = ()=>false)=>{
        if(e.key.toUpperCase() === 'ESCAPE') close();
        if(e.key.toUpperCase() === 'TAB') {
          interaction.tabIndex++;
          if(interaction.tabIndex > items.length - 1) interaction.tabIndex = 0;
          menu.querySelectorAll(`.circular-menu-item`).item(interaction.tabIndex).focus();
        }
        if(e.key.toUpperCase() === 'ENTER'){    
          action();
          close();
        }
        e.preventDefault(); 
        e.stopPropagation();
      } 
    }

    const target = document.getElementById(targetId);

    menu.append(menuContainer);
    menu.setAttribute('tabindex', '-1');
    menu.className = 'circular-menu';
    target.append(menu);
    

    menu.addEventListener('click', (e)=>{
      close();
      e.stopPropagation();
    });

    menu.addEventListener('keydown', e=>interaction.key(e));
    
    for (let index = 0; index < items.length; index++) {
      const _item = items[index];
      const angle = -Math.PI + index * step;

      const left = radius * Math.cos(angle);
      const top = radius * Math.sin(angle);

      const el = document.createElement('div');
      
      el.setAttribute('tabindex', '-1');
      el.className = 'circular-menu-item'
      el.innerHTML = _item.label;
      el.style.transitionDelay = `${index * 0.1}s`
      setTimeout(()=>{
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.transform = `scale(1)`;
      }, 300)

      el.addEventListener('click', (e)=>{
        _item.action();
        close();
        e.stopPropagation();
      });

      el.addEventListener('keydown', e=>interaction.key(e, _item.action));

      menuContainer.append(el);
    }    
    menu.focus();
  }
}

class InspectorModal {
  static create(contentFunction = (modal)=>"", closeCallback = ()=>false){
    const modal = document.createElement('dialog');
    modal.className = "inspector-modal";
    const addEvents = contentFunction(modal);
    modal.innerHTML += `<div class='inspector-modal-options'><button role="close" type="button">Fechar</button></div>`

    const close = ()=>{
      modal.classList.add('closing');
      modal.close();
      setTimeout(()=>{
        modal.parentNode.removeChild(modal);
      }, 300);
      closeCallback();
    }

    addEvents();
    modal.querySelector('.inspector-modal-options [role="close"]').addEventListener('click', ()=>{
      close();
    })

    const interaction = { 
      tabIndex: -1, 
      key: (e, action = ()=>false)=>{
        if(e.key.toUpperCase() === 'ESCAPE'){ 
          close();
          e.preventDefault(); 
          e.stopPropagation();
          return;
        }
        if(e.key.toUpperCase() === 'TAB') {
          interaction.tabIndex++;
          if(interaction.tabIndex > items.length - 1) interaction.tabIndex = 0;
          modal.querySelectorAll(`[tabindex],input,textarea,select`).item(interaction.tabIndex).focus();
          e.preventDefault(); 
          e.stopPropagation();
          return;
        }
        if(e.key.toUpperCase() === 'ENTER'){    
          action();
          close();
          e.preventDefault(); 
          e.stopPropagation();
          return;
        }
        
        e.stopPropagation();
      } 
    }

    document.body.append(modal);
    modal.addEventListener('keydown', e=>interaction.key(e));
    modal.showModal();
    modal.focus();
  }
}

const buildingMap = {
  "Cube.020_Cube.022": "loja_delegacia",
  "Cube.017_Cube.018": "loja_borracharia",
  "Cube.001_Cube.002": "predio_amarelo",
  "Cube.002_Cube.003": "predio_verde",
  "Cube.003_Cube.004": "predio_marrom",
  "Cube.004_Cube.005": "predio_marrom2",
  "Cube.005_Cube.006": "predio_azul2",
  "Cube.006_Cube.007": "predio_amarelo2",
  "Cube.007_Cube.008": "predio_verde2",
  "Cube.008_Cube.009": "predio_branco",
  "Cube.009_Cube.010": "loja_biscoitos",
  "Cube.010_Cube.011": "loja_sorveteria",
  "Cube.011_Cube.012": "loja_japones",
  "Cube.012_Cube.013": "loja_prefeitura",
  "Cube.013_Cube.014": "casa_branca",
  "Cube.014_Cube.015": "casa_laranja",
  "Cube.015_Cube.016": "casa_azul",
  "Cube.016_Cube.017": "casa_verde",
  "Cylinder.004_Cylinder.011": "arvore_1",
  "Cylinder.005_Cylinder.012": "arvore_2",
  "Cylinder.008_Cylinder.005": "arvore_3",
}

const vehicleMap = {
  "Car_12": {
      "capacity": 25,
      "cost": 70,
      "color": 0x407599
  },
  "Car_11": {
      "capacity": 22,
      "cost": 60,
      "color": 0x996e23
  },
  "Car_10": {
      "capacity": 20,
      "cost": 60,
      "color": 0x939393
  },
  "Car_09": {
      "capacity": 14,
      "cost": 30,
      "color": 0x8a9799
  },
  "Car_08": {
      "capacity": 14,
      "cost": 30,
      "color": 0x99811a
  },
  "Car_07": {
      "capacity": 14,
      "cost": 30,
      "color": 0x005d99
  },
  "Car_06": {
      "capacity": 4,
      "cost": 10,
      "color": 0x64278b
  },
  "Car_05": {
      "capacity": 4,
      "cost": 10,
      "color": 0x0d8879
  },
  "Car_04": {
      "capacity": 4,
      "cost": 10,
      "color": 0x987217
  },
  "CAR_03": {
      "capacity": 4,
      "cost": 10,
      "color": 0x0f5099
  },
  "CAR_02": {
      "capacity": 4,
      "cost": 10,
      "color": 0x992e45
  },
  "CAR_01": {
      "capacity": 4,
      "cost": 10,
      "color": 0x0d9884
  }
}

const vehicleTypes = {};
const buildingTypes = {};

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ 	powerPreference: "high-performance", 	antialias: true });
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

//#region Render Setup
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setAnimationLoop( update );
renderer.setClearColor( 0x56b1df, 1 );
// renderer.setClearColor( 0x000000, 1 );

document.querySelector('#game').appendChild( renderer.domElement );
window.onresize = function () {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  bloomComposer.setSize(width, height);
  finalComposer.setSize(width, height);
};
//#endregion

const composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
const bloomPass = new UnrealBloomPass( new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.4, 0.85 );
const outputPass = new OutputPass();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const grid = new HexGrid(scene, camera, 10, 10);

const vehicles = {};

const mouse = { pointer, clicked: false };

const runGroup = new THREE.Group();
scene.add(runGroup);

//#region Postprocessing Setup
composer.addPass( renderPass );
bloomPass.threshold = 0;
bloomPass.strength = 0.25;
bloomPass.radius = 0.0125;
composer.addPass( bloomPass );
composer.addPass( outputPass );
//#endregion

//#region Camera Setup
camera.position.set( 500, 500, 0 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.listenToKeyEvents( window );
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 30;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;
//#endregion

//#region Vehicle UI
const initVehicleUI = (targetId)=>{
  const target = document.getElementById(targetId);
  const ui = document.createElement('div');
  ui.className = 'vehicle-ui';

  for (const vehicle of Object.values(vehicleTypes)) {
    const vUI = document.createElement('div');
    
    vehicles[vehicle.name] = 0;

    vUI.className = 'vehicle';
    vUI.innerHTML = `
    <div class='info'>
      <span>Capacidade: ${vehicleMap[vehicle.name].capacity}</span>
      <span>Custo: $${vehicleMap[vehicle.name].cost} / km</span>
      <div class='controls'>
        <button class='remove'>-</button>
        <span class='value'>0</span>
        <button class='add'>+</button>
      </div>
    </div>
    `
    vUI.prepend(vehicle.thumbnail);

    vUI.querySelector('.add').addEventListener('click', ()=>{
      vehicles[vehicle.name]++;
      if( vehicles[vehicle.name] > 5) vehicles[vehicle.name] = 5;
      vUI.querySelector('.value').innerHTML = vehicles[vehicle.name];
    });
    vUI.querySelector('.remove').addEventListener('click', ()=>{
      vehicles[vehicle.name]--;
      if( vehicles[vehicle.name] < 0)  vehicles[vehicle.name] = 0;
      vUI.querySelector('.value').innerHTML = vehicles[vehicle.name];
    });

    ui.append(vUI);
  }

  target.append(ui);
}
//#endregion

//#region Loading Object Models
ModelLoader.load('./models/low_poly_cars_set/Low_Poly_City_Cars.obj', './models/low_poly_cars_set/Low_Poly_City_Cars.mtl').then(object=>{
  for (const mesh of object.children) {
    if(!mesh.name.toLowerCase().startsWith('car_')) continue;
    
    mesh.scale.x *= 0.1;
    mesh.scale.y *= 0.1;
    mesh.scale.z *= 0.1;
    vehicleTypes[mesh.name] = ( new VehicleType(mesh) );
  }
  initVehicleUI('ui');
})

ModelLoader.load('./models/build set lowpoly.obj', './models/build set lowpoly.mtl').then(object=>{
  for (const mesh of object.children) {
    mesh.scale.x *= 10;
    mesh.scale.y *= 10;
    mesh.scale.z *= 10;
    buildingTypes[buildingMap[mesh.name] ?? mesh.name] = new BuildingType(mesh, buildingMap[mesh.name] ?? mesh.name);
  }
})
//#endregion

//#region Interaction Setup
document.addEventListener( 'pointermove', (event)=>{
  mouse.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
});

// renderer.domElement.addEventListener( 'mousedown', (event)=>{
//   mouse.clicked = true;
// });
// renderer.domElement.addEventListener( 'mouseup', (event)=>{
//   mouse.clicked = false;
// });

renderer.domElement.addEventListener( 'dblclick', (event)=>{
  mouse.clicked = true;

  const selection = grid.getSelected();
  CircularMenu.create([
    ...(selection && selection.filled? [
      { label: 'Remover', action: () => grid.clearSelected() },
      { label: 'Configurar', action: () => InspectorModal.create((modal)=>{
        mouse.clicked = true;

        const isDeposito = selection.object.userData.type === ObjectInfo.TYPES.DEPOSITO;

        let html = `
        <h3>Configurar ${isDeposito? "Depósito": "Ponto de Entrega" }</h3>
        `;

        if(selection.object.userData.value !== -1) html += `<label>
          <span>${isDeposito? "": "Demanda" }</span>
          <input type="number" min="0" step="0.1" max="9999" value="${selection.object.userData.value}" />
        </label>`
        if(selection.object.userData.value === -1) html += `<span class='note'>Nenhuma opção.</span>`;

        modal.innerHTML = html;

        return ()=>{
          const i = modal.querySelector('input');
          if(!i) return;
          i.addEventListener('input', e=>{
            selection.object.userData.value = parseFloat(e.target.value);
          });
        };
      }, ()=>mouse.clicked = false) },
    ]: []),
    { 
      label: "Depósito",
      action: ()=>{
        grid.clearSelected();
        const loja = buildingTypes["loja_borracharia"].instatiate(selection.hexagon);
        loja.position.x = 0;
        loja.position.z = -selection.h / 2;
        loja.position.y = 0; 
        loja.rotation.x -= Math.PI / 2;
        loja.name = selection.hexagon.name + "_object";
        loja.userData = new ObjectInfo(ObjectInfo.TYPES.DEPOSITO);
        grid.fillSelected(loja);
      
      }
    },
    {
      label: "Ponto de Entrega",
      action: ()=>{
        grid.clearSelected();
        const location = ["casa_azul", "casa_branca", "casa_laranja", "casa_verde", "predio_amarelo", "predio_amarelo2", "predio_azul2", "predio_marrom", "predio_marrom2", "predio_verde", "predio_verde2"].sort(()=>Math.random()-0.5)[0];
        const loja = buildingTypes[location].instatiate(selection.hexagon);
        loja.position.x = 0;
        loja.position.z = -selection.h / 2;
        loja.position.y = 0; 
        loja.rotation.x -= Math.PI / 2;
        loja.name = selection.hexagon.name + "_object"; 
        loja.userData = new ObjectInfo(ObjectInfo.TYPES.ENTREGA, Math.random() * 25);
        grid.fillSelected(loja);
      }
    }
  ], "ui", ()=>mouse.clicked = false)
});

function update() {
  raycaster.setFromCamera( mouse.pointer, camera );

  const intersects = raycaster.intersectObject( scene, true );

  if ( intersects.length > 0 ) {
    for (const intersection of intersects) {
      if(!intersection.object || !intersection.object.name.startsWith('hexagon_')) continue;
      const hexagon = intersection.object;
      if( !mouse.clicked ) {
        grid.highlight(hexagon.userData.index);
      }
    }
  }

  for(const child of runGroup.children){
    if(typeof child.userData.update === 'function'){
      child.userData.update(child, child.userData.curve, child.userData.index);
      child.userData.index++;
      if(child.userData.index > child.userData.curve.getLength() - 1) child.userData.index = 0;
    }
  }

  composer.render();
};
update();


function createObjectThumb(width = 200, height = 200, objectType){
  const s = new THREE.Scene();
  const r = new THREE.WebGLRenderer({ 	powerPreference: "high-performance", 	antialias: true, transparent: true });
  const c = new THREE.PerspectiveCamera( 75, width / height, 0.1, 1000 );
  r.setPixelRatio( width / height );
  r.setSize( width, height );
  // document.body.appendChild( r.domElement );
  
  r.setClearAlpha(0);
  r.domElement.style.zIndex = 99;
  r.domElement.style.position = 'absolute';
  
  s.add(new THREE.AmbientLight(0xffffff, 1));

  c.position.set(0, 0, 0);
  c.rotation.set(0, 0, 0);

  const o = objectType.instatiate(s);

  o.position.set(-5, -5, -30)
  o.rotation.set(0, -0.75, 0)
  r.render(s, c);

  const image = new Image()
  image.src = r.domElement.toDataURL('image/png', 1);

  r.dispose();
  return image;
}
//#endregion

function run(){
  runGroup.clear();
  const { cities, demands, depots, indexes, map } = grid.output();

  const vehicleCapacities = Object.keys( vehicles ).map(k=>{
    const n = vehicles[k];
    const i = vehicleMap[k];
    return n === 0? []: Array.from( { length: n }, ()=>({ capacity: i.capacity, name: k, info: i }) );
  }).flat();

  const acoVRP = new ACO_VRP(cities, demands, vehicleCapacities.map(v=>v.capacity), depots, 10, 1, 2, 0.5, 50, map, indexes);
  const result = acoVRP.runMultiDepotVRP();

  for (let ri = 0; ri < result.bestRealRoutes.length; ri++) {
    const _vehicle = vehicleCapacities[ri];
    const bestRealRoute = result.bestRealRoutes[ri];
    
    const positions = grid.routeToPosition( bestRealRoute );

    const curve = new THREE.CatmullRomCurve3( positions );
    const points = curve.getPoints( 50 );

    const geometry = new LineGeometry().setFromPoints( points );
    const material = new LineMaterial( { color: _vehicle.info.color, linewidth: 5 } );
    const line = new Line2( geometry, material );

    line.position.y += 10;

    const car = vehicleTypes[_vehicle.name].instatiate(runGroup);

    car.userData = {
      index: 0,
      route: bestRealRoute,
      curve,
      update: (_car, _curve, _index = 0)=>{
        const lookAt = new THREE.Vector3();
        const axis = new THREE.Vector3(0, -1, 0);


        const t = _curve.getLength();
        const pos = _curve.getPoint(_index / t);
        const next = _curve.getPoint((_index+1) / t);
        const rot = _curve.getTangent(_index / t);

        lookAt.copy(next).sub(pos).applyAxisAngle(axis, Math.PI / 2).add(pos); // look at the point 90 deg from the path
    
        _car.position.x = pos.x;
        _car.position.y = pos.y;
        _car.position.z = pos.z;
        
        _car.rotation.x = rot.x;
        _car.rotation.y = rot.y;
        _car.rotation.z = rot.z;
    
        // _car.lookAt(next);
        _car.lookAt(lookAt);
        
        // _car.rotation.y += Math.PI / 2;
        _car.position.y += 10;
      }
    }
    runGroup.add( line );
  }
}

const runButton = document.createElement('button');
runButton.textContent = 'Otimizar';
runButton.id = 'runButton';

runButton.addEventListener('click', ()=>run());

document.getElementById('ui').append(runButton);

// (function(){

//   const cities = [
//     [0, 2, 2, 5, 9, 8], // Matriz de distâncias
//     [2, 0, 4, 3, 6, 7],
//     [2, 4, 0, 1, 7, 5],
//     [5, 3, 1, 0, 4, 6],
//     [9, 6, 7, 4, 0, 2],
//     [8, 7, 5, 6, 2, 0]  // Depósito extra (cidade 5)
// ];

// const demands = [0, 3, 2, 4, 5, 0]; // Demanda das cidades (0 nos depósitos)
// const vehicleCapacities = [10, 7]; // Capacidades dos veículos
// const depots = [5, 0]; // Índices dos depósitos

// const acoVRP = new ACO_VRP(cities, demands, vehicleCapacities, depots, 10, 1, 2, 0.5, 50);
// const result = acoVRP.runMultiDepotVRP();

// console.log("Melhores rotas encontradas:", result.bestRoutes);
// console.log("Distância total das melhores rotas:", result.bestDistance);

// // Desenhar no canvas
// const coordinates = [
//     [100, 100], // Cidade 0 (Depósito 1)
//     [200, 100], // Cidade 1
//     [200, 200], // Cidade 2
//     [100, 200], // Cidade 3
//     [300, 150], // Cidade 4
//     [400, 100]  // Cidade 5 (Depósito 2)
// ];

// })()