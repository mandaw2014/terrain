let camera, scene, renderer, controls, stats;

// Collidable Objects Array
const objects = [];

let raycaster;

// Control Booleans
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let isSprinting = false;

// World
let mesh, texture, container;
const worldWidth = 150; 
const worldDepth = 150;
const clock = new THREE.Clock();

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbfffe);
    scene.fog = new THREE.FogExp2(0xc1c1c1, 0.005);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 1200;
    camera.rotation.y = 98.96;

    controls = new THREE.PointerLockControls(camera, document.body);

    window.addEventListener("click", function() {
        controls.lock();
    });

    controls.addEventListener("lock", function() {

    });

    controls.addEventListener("unlock", function () {

    });

    scene.add(controls.getObject());

    // Control Keys
    const onKeyDown = function(event) {
        switch (event.code) {
            case "ArrowUp":
            case "KeyW":
                moveForward = true;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = true;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = true;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = true;
                break;

            case "KeyR": 
                isSprinting = true;
                break;

            case "Space":
                if (canJump === true) velocity.y += 220;
                canJump = false;
                break;
        }
    };

    const onKeyUp = function(event) {

        switch(event.code) {
            case "ArrowUp":
            case "KeyW":
                moveForward = false;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = false;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = false;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = false;
                break;

            case "KeyR":
                isSprinting = false;
                break;
        }
    };

    stats = new Stats();
    document.body.appendChild(stats.dom);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0 ), 0, 10);

    // Terrain Mesh
    const data = generateHeight(worldWidth, worldDepth);
    const geometry = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
    geometry.rotateX(- Math.PI / 2);

    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3) {
        vertices[j + 1] = data[i] * 10;
    }

    texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({map: texture}));
    scene.add(mesh);
    objects.push(mesh);

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize);
}

// Terrain Height
function generateHeight(width, height) {
    let seed = Math.PI / 4;
    window.Math.random = function() {
        const x = Math.sin(seed ++) * 10000;
        return x - Math.floor(x);
    };

    const size = width * height, data = new Uint8Array(size);
    const perlin = new ImprovedNoise(), z = Math.random() * 100;

    let quality = 1;

    for (let j = 0; j < 4; j ++) {
        for (let i = 0; i < size; i ++) {
            const x = i % width, y = ~ ~ (i / width);
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
        }

        quality *= 5;
    }

    return data;
}

// Terrain Texture
function generateTexture(data, width, height) {
    let context, image, imageData, shade;
    const vector3 = new THREE.Vector3(0, 0, 0);
    const sun = new THREE.Vector3(1, 1, 1);
    sun.normalize();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext("2d");
    context.fillStyle = "#bec9be";
    context.fillRect(0, 0, width, height);

    image = context.getImageData(0, 0, canvas.width, canvas.height);
    imageData = image.data;

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j ++) {
        vector3.x = data[j - 2] - data[j + 2];
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2];
        vector3.normalize();

        shade = vector3.dot(sun);

        // Gray Colour
        imageData[i] = (100 + shade * 1) * (0.5 + data[j] * 0.007);
        imageData[i + 1] = (100 + shade * 1) * (0.5 + data[j] * 0.007);
        imageData[i + 2] = (shade + 100 * 1) * (0.5 + data[j] * 0.007);
    }

    context.putImageData(image, 0, 0);

    // Scaled 4x
    const canvasScaled = document.createElement("canvas");
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext("2d");
    context.scale(4, 4);
    context.drawImage(canvas, 0, 0);

    image = context.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
    imageData = image.data;

    for(let i = 0, l = imageData.length; i < l; i += 4) {
        const v = ~ ~ (Math.random() * 5);
        imageData[i] += v;
        imageData[i + 1] += v;
        imageData[i + 2] += v;
    }
    context.putImageData(image, 0, 0);

    return canvasScaled;
}

// Resize Event
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    // Collisions
    if (controls.isLocked === true) {
        raycaster.ray.origin.copy(controls.getObject().position);
        raycaster.ray.origin.y -= 10;
        const intersections = raycaster.intersectObjects(objects);
        const onObject = intersections.length > 0;
        const delta = (time - prevTime) / 1000;
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 50.0 * delta; // 100.0 = mass
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); 

        // Player Movement
        if (moveForward || moveBackward ) 
            velocity.z -= direction.z * 500.0 * delta;
        if (moveLeft || moveRight) 
            velocity.x -= direction.x * 500.0 * delta;
        if (moveForward && isSprinting) 
            velocity.z -= direction.z * 600.0 * delta;

        // If On Object That Is Collidable Then CanJump = True
        if (onObject === true) {
            velocity.y = Math.max(0, velocity.y);
            canJump = true;
        }

        controls.moveRight(- velocity.x * delta);
        controls.moveForward(- velocity.z * delta);

        controls.getObject().position.y += (velocity.y * delta);

        if (controls.getObject().position.y < 10) {
            velocity.y = 0;
            controls.getObject().position.y = 10;
            canJump = true;
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
    stats.update();

    // Stopping The Player From Falling Forever
    if(camera.position.y <= 10) {
        camera.position.y += 1100
    } 
}
