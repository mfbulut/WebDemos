const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const vecAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vecSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vecMul = (a, b) => [a[0] * b, a[1] * b, a[2] * b];
const normalize = (v) => {
    const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (m <= 0) return v;
    return [v[0] / m, v[1] / m, v[2] / m];
};

class Camera {
    constructor(canvas, position, rotation) {
        this.position = position || [0, 0, 0];
        this.rotation = rotation || [0, 0, 0];
        this.front = [0, 0, 1];
        this.right = [0, 0, 0];
        this.up = [0, 0, 0];
        this.keys = {};

        window.onkeydown = e => this.keys[e.key] = true;
        window.onkeyup = e => this.keys[e.key] = false;

        canvas.addEventListener("mousemove", (event) => {
            this.rotation[1] -= event.movementX / canvas.width;
            this.rotation[0] += event.movementY / canvas.height;
            this.rotation[0] = clamp(this.rotation[0], -Math.PI / 2, Math.PI / 2)
            this.updateVectors();
        });

        canvas.addEventListener("click", async () => {
            await canvas.requestPointerLock();
        });
    }

    moveBy(speed) {
        let mov = [0, 0, 0];
        if (this.keys["w"]) mov = vecAdd(mov, this.front);
        if (this.keys["a"]) mov = vecAdd(mov, this.right);
        if (this.keys["s"]) mov = vecSub(mov, this.front);
        if (this.keys["d"]) mov = vecSub(mov, this.right);
        if (this.keys["q"]) mov = vecSub(mov, this.up);
        if (this.keys["e"]) mov = vecAdd(mov, this.up);
        if (this.keys["f"]) speed *= 0.05;
        this.position = vecAdd(this.position, vecMul(normalize(mov), speed))
    }

    updateVectors() {
        const sinX = Math.sin(this.rotation[0]);
        const sinY = Math.sin(this.rotation[1]);

        const cosX = Math.cos(this.rotation[0]);
        const cosY = Math.cos(this.rotation[1]);

        this.front = normalize([-sinY * cosX, -sinX, cosY * cosX]);
        this.right = normalize([-this.front[2], 0, this.front[0]]);
        this.up = normalize([
            this.right[2] * this.front[1],
            this.right[0] * this.front[2] - this.right[2] * this.front[0],
            -this.right[0] * this.front[1],
        ]);
    }
}


const shader = `
struct Uniforms {
    position : vec3f,
    rotation : vec3f
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var screen: texture_storage_2d<bgra8unorm,write>;
@group(1) @binding(1) var myTexture: texture_external;

const Size = 64;
const MaxIterations = 128;

fn GetVoxel(c : vec3<f32>) -> vec3f {
    if(max(max(c.x, c.y), c.z) > Size - 1 || 0 > min(min(c.x, c.y), c.z)) {
        return vec3f(0);
    }

    let index : u32 = u32(c.x) + u32(c.y) * Size + u32(c.z) * Size * Size;
    let sample = textureLoad(myTexture, vec2u(index % (Size * 8), index / (Size * 8)));
    return sample.rgb;
}

fn Rotate2D(v : vec2<f32>, a : f32) -> vec2<f32>{
    let SinA : f32 = sin(a);
    let CosA : f32 = cos(a);
    return vec2<f32>(v.x * CosA - v.y * SinA, v.y * CosA + v.x * SinA);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) Pixel: vec3u) {
    let Resolution = textureDimensions(screen).xy;
    let AspectRatio = f32(Resolution.y) / f32(Resolution.x);

    if (Pixel.x >= Resolution.x || Pixel.y >= Resolution.y){
        return;
    }
    
    let FragCoord = vec2f(f32(Pixel.x) + .5, f32(Resolution.y - Pixel.y) - .5);

    let UV = 2. * FragCoord / vec2f(Resolution) - 1.;

    let CameraDirection = vec3<f32>(0., 0., .8);
    let CameraPlaneU = vec3<f32>(1., 0., 0.);
    let CameraPlaneV = vec3<f32>(0., AspectRatio, 0.);
    
    var RayDirection = CameraDirection + UV.x * CameraPlaneU + UV.y * CameraPlaneV;
    var RayPosition = uniforms.position;

    let RotationYZ = Rotate2D(RayDirection.yz, uniforms.rotation.x);
    RayDirection = vec3<f32>(RayDirection.x, RotationYZ.x, RotationYZ.y);

    let RotationXZ = Rotate2D(RayDirection.xz, uniforms.rotation.y);
    RayDirection = vec3<f32>(RotationXZ.x, RayDirection.y, RotationXZ.y);

    let DeltaDistance = abs(vec3(length(RayDirection)) / RayDirection);
    let RayStep = sign(RayDirection);

    var MapPosition = floor(RayPosition);
    var SideDistance = (sign(RayDirection) * (MapPosition - RayPosition) + (sign(RayDirection) * .5) + .5) * DeltaDistance;
    var Normal = vec3<f32>(0.);

    var hit = vec3f(0);
    for(var i : u32 = 0u; i < MaxIterations; i++){
        hit = GetVoxel(MapPosition);
        if(!all(hit <= vec3f(0.4))){
            break;
        }
        Normal = step(SideDistance, min(SideDistance.yxy, SideDistance.zzx));
        SideDistance = fma(Normal, DeltaDistance, SideDistance);
        MapPosition = fma(Normal, RayStep, MapPosition);
    }

    let Colour = vec3<f32>(length(Normal * vec3<f32>(.75, 1., .5)) * hit);
    textureStore(screen, Pixel.xy, vec4<f32>(Colour, 1.));
}
`;

if (!navigator.gpu) {
    throw Error('WebGPU not supported.');
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw Error('Couldn\'t request WebGPU adapter.');
}

const device = await adapter.requestDevice({
    requiredFeatures: ["bgra8unorm-storage"],
});

const canvas = document.querySelector('#gpuCanvas');
const context = canvas.getContext('webgpu');

context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: 'premultiplied',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
});

const shaderModule = device.createShaderModule({
    code: shader
});

const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
        module: shaderModule,
        entryPoint: 'main'
    }
});

const uniformBufferSize = 4 * 8; // 4x4 matrix
const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: uniformBuffer,
            },
        }
    ],
});

const cam = new Camera(canvas, [0, 5, -20]);

const video = document.createElement("video");
video.loop = true;
video.autoplay = true;
video.muted = true;
video.src = "output.mp4";
await video.play();

let last = 0;
function frame(time) {
    time /= 1000;
    cam.moveBy((time - last) * 20);
    last = time;

    const videoFrame = new VideoFrame(video);
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(1),
        entries: [
            {
                binding: 0,
                resource: context.getCurrentTexture().createView(),
            },
            {
                binding: 1,
                resource: device.importExternalTexture({
                    source: videoFrame
                }),
            },
        ]
    });

    console.log(cam.position[1])
    const myBuffer = new Float32Array([...cam.position, 0, ...cam.rotation])
    device.queue.writeBuffer(uniformBuffer, 0, myBuffer.buffer, myBuffer.byteOffset, myBuffer.byteLength);

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setBindGroup(1, bindGroup);
    passEncoder.dispatchWorkgroups(
        Math.ceil(canvas.width / 16),
        Math.ceil(canvas.height / 16));
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    videoFrame.close();


    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);