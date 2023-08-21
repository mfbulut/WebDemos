const shaders = `
struct Uniforms {
  position : vec3f,
  time : f32,
  rotation : vec3f,
  ratio: f32
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f
}

@vertex
fn vertex_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOut
{
  var output : VertexOut;
  output.uv = vec2f(f32((VertexIndex << 1) & 2), f32(VertexIndex & 2));
  output.position = vec4f(output.uv.x * 2.0 - 1.0, output.uv.y * -2.0 + 1.0, 0.0, 1.0);
  return output;
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var myData: texture_3d<u32>;

@fragment
fn fragment_main(@location(0) uv : vec2f) -> @location(0) vec4f
{
  var screenPos = uv * 2.0 - 1.0;
  var rayDir = vec3f(screenPos.x, uniforms.ratio * screenPos.y, 0.8);
  var rayPos = uniforms.position;
    
  var rayDiryYZ = rotate2d(rayDir.yz, uniforms.rotation.x);
  rayDir = vec3(rayDir.x, rayDiryYZ.x, rayDiryYZ.y); 
  var rayDirXZ = rotate2d(rayDir.xz, uniforms.rotation.y);
  rayDir = vec3(rayDirXZ.x, rayDir.y, rayDirXZ.y);  
    
  var mapPos = vec3i(floor(rayPos));
  var deltaDist = abs(length(rayDir) / rayDir);
  var rayStep = vec3i(sign(rayDir));
  var sideDist = (sign(rayDir) * (vec3f(mapPos) - rayPos) + (sign(rayDir) * 0.5) + 0.5) * deltaDist; 
  var mask : vec3f = vec3f(0.0);
  
  var block: u32 = 0;
  for (var i : i32 = 0; i < 128; i = i + 1) {
    block = getVoxel(mapPos);
    if (block > 0) {
      break;
    }

    mask = vec3f(sideDist.xyz <= min(sideDist.yzx, sideDist.zxy));
    sideDist = sideDist + mask * deltaDist;
    mapPos = mapPos + vec3i(mask) * rayStep;
  }

  if(block == 0) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }

  var intersectPlane : vec3f = vec3f(mapPos) + step(vec3f(0.0), rayDir);
  var endRayPos : vec3f = rayDir / dot(mask, rayDir) * dot(mask, (vec3f(mapPos) + vec3f(rayDir < vec3f(0.0)) - rayPos)) + rayPos;
  var voxelUv: vec2f = vec2f(fract(dot(mask * endRayPos.yzx, vec3f(1.0))), fract(dot(mask * endRayPos.zxy, vec3f(1.0))));
  var ambient : vec4f = voxelAo(vec3f(mapPos - rayStep * vec3i(mask)), vec3f(mask.zxy), vec3f(mask.yzx));
  
  var interpAo : f32 = mix(mix(ambient.z, ambient.w, voxelUv.x), mix(ambient.y, ambient.x, voxelUv.x), voxelUv.y);
  interpAo = pow(interpAo, 1.0 / 3.0);

  var lightDirection = normalize(vec3f(1.0));
  var normals: vec3f = mask * vec3f(-rayStep);
  var diff: f32 = clamp(dot(normals, lightDirection), 0.3, 1.0);

  voxelUv.x = (voxelUv.x + f32(block % 32)) / 32.0;
  voxelUv.y = (voxelUv.y + f32(i32(block) / 32)) / 16;

  var texture = textureSampleBaseClampToEdge(myTexture, mySampler, voxelUv);

  var color : vec3f = (0.25 + diff * 0.5 + interpAo * 0.25) * texture.xyz;

  return vec4f(color, 1.0);
}

fn getVoxel(c: vec3i) -> u32 {
  if(c.x < 0 || c.y < 0|| c.z < 0 || c.x > 32 || c.y > 32|| c.z > 32) { 
    return 0;
   }
  return textureLoad(myData, vec3u(u32(c.x), u32(c.y), u32(c.z)), 0).r;
}

fn testVoxel(c: vec3i) -> bool {
  return textureLoad(myData, vec3u(u32(c.x), u32(c.y), u32(c.z)), 0).r > 0;
}

fn rotate2d(v: vec2f, a: f32) -> vec2f {
  var sinA = sin(a);
  var cosA = cos(a);
  return vec2f(v.x * cosA - v.y * sinA, v.y * cosA + v.x * sinA);
}

fn voxelAo(pos: vec3f, d1: vec3f, d2: vec3f) -> vec4f {
  let side: vec4f = vec4f(
    f32(testVoxel(vec3i(pos + d1))), 
    f32(testVoxel(vec3i(pos + d2))), 
    f32(testVoxel(vec3i(pos - d1))), 
    f32(testVoxel(vec3i(pos - d2)))
  );
  let corner: vec4f = vec4f(
    f32(testVoxel(vec3i(pos + d1 + d2))), 
    f32(testVoxel(vec3i(pos - d1 + d2))), 
    f32(testVoxel(vec3i(pos - d1 - d2))), 
    f32(testVoxel(vec3i(pos + d1 - d2)))
  );

  var ao: vec4f = vec4f(0.0);
  ao.x = (side.x + side.y + max(corner.x, side.x * side.y)) / 3.0;
  ao.y = (side.y + side.z + max(corner.y, side.y * side.z)) / 3.0;
  ao.z = (side.z + side.w + max(corner.z, side.z * side.w)) / 3.0;
  ao.w = (side.w + side.x + max(corner.w, side.w * side.x)) / 3.0;
  return vec4f(1.0) - ao;
}
`;

const vecAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vecSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vecMul = (a, b) => [a[0] * b, a[1] * b, a[2] * b];
const normalize = (v) => {
  const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (m <= 0) return v;
  return [v[0] / m, v[1] / m, v[2] / m];
};

function sdBox(p, b) {
  var q = [Math.abs(p[0]) - b[0], Math.abs(p[1]) - b[1], Math.abs(p[2]) - b[2]];
  return (
    Math.sqrt(
      Math.max(q[0], 0) ** 2 + Math.max(q[1], 0) ** 2 + Math.max(q[2], 0) ** 2
    ) + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0)
  );
}

class FreeCamera {
  constructor(canvas, position = [0, 0, 0], rotation = [0, 0, 0]) {
    Object.assign(this, {
      position,
      rotation,
      front: [0, 0, 1],
      right: [0, 0, 0],
      up: [0, 0, 0],
      keys: {},
    });

    this.updateVectors();

    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });

    canvas.addEventListener("mousemove", (event) => {
      this.rotation[1] -= event.movementX / canvas.width;
      this.rotation[0] -= event.movementY / canvas.height;
      this.rotation[0] = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.rotation[0])
      );
      this.updateVectors();
    });

    canvas.addEventListener("click", async () => {
      await canvas.requestPointerLock();
    });
  }

  update(deltaTime) {
    let mov = [0, 0, 0];

    if (this.keys["w"]) {
      mov = vecAdd(mov, this.front);
    }

    if (this.keys["a"]) {
      mov = vecAdd(mov, this.right);
    }

    if (this.keys["s"]) {
      mov = vecSub(mov, this.front);
    }

    if (this.keys["d"]) {
      mov = vecSub(mov, this.right);
    }

    if (this.keys["q"]) {
      mov = vecSub(mov, this.up);
    }

    if (this.keys["e"]) {
      mov = vecAdd(mov, this.up);
    }

    if (this.keys["f"]) {
      deltaTime *= 0.05;
    }
    this.position = vecAdd(this.position, vecMul(normalize(mov), deltaTime));
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

function webGPUTextureFromImageBitmapOrCanvas(gpuDevice, source) {
  const textureDescriptor = {
    size: { width: source.width, height: source.height },
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  };
  const texture = gpuDevice.createTexture(textureDescriptor);

  gpuDevice.queue.copyExternalImageToTexture(
    { source },
    { texture },
    textureDescriptor.size
  );

  return texture;
}

async function webGPUTextureFromImageUrl(gpuDevice, url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const imgBitmap = await createImageBitmap(blob);

  return webGPUTextureFromImageBitmapOrCanvas(gpuDevice, imgBitmap);
}

async function init() {
  if (!navigator.gpu) {
    throw Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU adapter.");
  }

  let device = await adapter.requestDevice();

  const shaderModule = device.createShaderModule({
    code: shaders,
  });

  const canvas = document.getElementById("gpuCanvas");
  let aspectRatio = 1;
  window.addEventListener("resize", resizeCanvas, false);
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    aspectRatio = canvas.height / canvas.width;
  }
  resizeCanvas();
  const context = canvas.getContext("webgpu");

  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });

  const pipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    },
    layout: "auto",
  };

  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  const uniformBufferSize = 32;
  uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const texture = await webGPUTextureFromImageUrl(device, "atlas.png");

  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
  });

  const uniformBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: texture.createView(),
      },
    ],
  });

  // prettier-ignore
  const packedBunny = new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,917504,917504,917504,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1966080,12531712,16742400,16742400,16723968,16711680,8323072,4128768,2031616,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6144,2063360,16776704,33553920,33553920,33553920,33553920,33520640,16711680,8323072,8323072,2031616,0,0,0,0,0,0,0,0,0,0,0,0,268435456,402653184,134217728,201326592,67108864,0,0,7168,2031104,16776960,33554176,33554176,33554304,33554176,33554176,33554176,33553920,16744448,8323072,4128768,1572864,0,0,0,0,0,0,0,0,0,0,805306368,939524096,402653184,478150656,260046848,260046848,260046848,125832192,130055680,67108608,33554304,33554304,33554304,33554304,33554304,33554304,33554304,33554176,16776704,8355840,4128768,917504,0,0,0,0,0,0,0,0,0,805306368,1056964608,1056964608,528482304,528482304,260046848,260046848,260046848,130039296,130154240,67108739,67108807,33554375,33554375,33554370,33554368,33554368,33554304,33554304,16776960,8330240,4128768,393216,0,0,0,0,0,0,0,0,939524096,1040187392,1040187392,520093696,251658240,251658240,260046848,125829120,125829120,130088704,63045504,33554375,33554375,33554375,33554407,33554407,33554370,33554370,33554374,33554310,16776966,4144642,917504,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15360,130816,262017,4194247,33554383,67108847,33554415,33554407,33554407,33554375,33554375,33554318,2031502,32262,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31744,130816,262019,2097151,134217727,134217727,67108863,33554415,33554407,33554415,33554383,2097102,982926,32262,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31744,130816,524263,117964799,127926271,134217727,67108863,16777215,4194303,4194303,2097151,1048574,65422,16134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,31751,130951,524287,252182527,261095423,261095423,59768830,2097150,1048574,1048575,262143,131070,65534,16134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,31751,130959,503840767,520617982,529530879,261095423,1048575,1048574,1048574,524286,524287,131070,65534,16134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1799,32527,134348750,1040449534,1057488894,520617982,51380223,1048575,1048575,524287,524287,524287,131070,65534,15886,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1536,3968,8175,65535,1006764030,1040449534,1057488894,50855934,524286,524286,524287,524287,524286,262142,131070,65534,32270,14,6,0,0,0,0,0,0,0,0,0,0,0,0,0,3968,8160,8191,805371903,2080505854,2114191358,101187582,34078718,524286,524286,524286,524286,524286,524286,262142,131070,32766,8078,3590,0,0,0,0,0,0,0,0,0,0,0,0,0,8128,8176,16383,2013331455,2080505854,235143166,101187582,524286,1048574,1048574,1048574,1048574,524286,524286,262142,131070,32766,16382,8070,1024,0,0,0,0,0,0,0,0,0,0,0,0,8160,8184,1879064574,2013331455,470024190,67371006,524286,1048574,1048574,1048574,1048574,1048574,1048574,524286,524286,262142,65534,16382,8160,1024,0,0,0,0,0,0,0,0,0,0,0,0,8128,8184,805322750,402718719,134479870,524286,524286,1048574,1048574,1048574,1048574,1048574,1048574,1048574,524286,262142,65534,16382,16368,1792,0,0,0,0,0,0,0,0,0,0,0,0,3968,8184,16382,131071,262142,524286,1048574,1048574,1048574,1048574,1048574,1048574,1048574,1048574,524286,262142,65534,16382,16368,1792,0,0,0,0,0,0,0,0,0,0,0,0,1792,8184,16380,65535,262143,524286,524286,1048574,1048574,1048575,1048574,1048574,1048574,1048574,524286,262142,65534,16376,16368,1792,0,0,0,0,0,0,0,0,0,0,0,0,0,8176,16376,32767,262143,524286,1048574,1048574,1048575,1048575,1048575,1048575,1048574,1048574,524286,262142,32766,16376,8176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4032,8184,32766,262142,524286,524286,1048575,1048574,1048574,1048574,1048574,1048574,1048574,524286,262142,32766,16376,8176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,384,8184,32766,131070,262142,524286,1048575,1048574,1048574,1048574,1048574,1048574,524286,524286,131070,32766,16368,1920,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4080,32764,65534,262142,524286,524286,524286,1048574,1048574,524286,524286,524286,262142,131070,32764,8160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,256,16376,32760,131068,262140,262142,524286,524286,524286,524286,524286,262142,131070,65532,16368,3840,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3968,32752,65528,131068,262142,262142,262142,262142,262142,262142,262140,131064,32752,7936,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8064,32736,65528,131070,131070,131070,131070,131070,131070,65532,32752,8160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3456,16376,32764,65534,65534,65534,32766,32764,16380,4048,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,2680,8188,8188,8188,8188,4092,120,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,248,508,508,508,248,240,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,240,504,504,504,240,96,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,224,224,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
  const unpackedBunny = new Uint8Array(32 * 32 * 32);

  function randomBlock(min, max) {
    return Math.floor(Math.random() * (128 - 1 + 1)) + 1;
  }

  for (let i = 0; i < 32 * 32; i++) {
    for (let j = 0; j < 32; j++) {
      unpackedBunny[i * 32 + j] = (packedBunny[i] >> j) & 1 ? randomBlock() : 0;
    }
  }

  for (let i = 0; i < 256; i++) {
    unpackedBunny[i] = i;
  }

  const dataTexture = device.createTexture({
    size: { width: 32, height: 32, depthOrArrayLayers: 32 },
    dimension: "3d",
    format: "r8uint",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  device.queue.writeTexture(
    { texture: dataTexture },
    unpackedBunny.buffer,
    {
      bytesPerRow: 32,
      rowsPerImage: 32,
    },
    { width: 32, height: 32, depthOrArrayLayers: 32 }
  );

  const dataBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: dataTexture.createView(),
      },
    ],
  });

  const camera = new FreeCamera(canvas, [16, 16, -8]);

  let lastTime = 0;
  function frame(time) {
    const deltaTime = time - lastTime;
    lastTime = time;

    camera.update(deltaTime / 100);

    buffer = new Float32Array([
      ...camera.position,
      time / 1000,
      ...camera.rotation,
      aspectRatio,
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, buffer.buffer, 0, 32);

    const commandEncoder = device.createCommandEncoder();

    const renderPassDescriptor = {
      colorAttachments: [
        {
          loadOp: "clear",
          storeOp: "store",
          view: context.getCurrentTexture().createView(),
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setBindGroup(1, dataBindGroup);
    passEncoder.draw(3);

    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();
