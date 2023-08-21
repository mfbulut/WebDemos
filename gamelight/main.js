const shader = `
struct Uniform {
    player: vec4f,
    LIGHT_FALLOFF: f32,
    LIGHT_RADIUS: f32,
    elapsed: f32, 
    frame: u32,
};

@group(0) @binding(0) var screen: texture_storage_2d<bgra8unorm,write>;
@group(1) @binding(0) var<uniform> uniforms: Uniform;

const SAMPLES = 8;
const PI = 3.141592564;

const materials = array<vec3<f32>, 4>(
    vec3<f32>(1.000,1.000,1.000), 
    vec3<f32>(1.000,0.067,0.157), 
    vec3<f32>(0.027,0.945,0.259), 
    vec3<f32>(0.318,0.553,0.992)  
);

const points = array<vec2<f32>, 18>(
    vec2(.1,-.25), 
    vec2(.3,-.25), 
    vec2(.1,-.05),
    vec2(.3,-.05), 
    vec2(-.9,-.8), 
    vec2(.8,-.8),  
    vec2(-.9,-1.), 
    vec2(.8,1.),   
    vec2(-.4,-.3), 
    vec2(-.2,-.3), 
    vec2(-.4,-.1), 
    vec2(-.2,-.1),
    vec2(-.05,-.05),
    vec2(-.05,-.15),
    vec2(0,-.1),
    vec2(-.1,-.1),
    vec2(-0.,-.8), 
    vec2(.8,-0.2),
);

const segments = array<vec3<i32>, 16>(
    vec3(0,1,1), 
    vec3(0,2,1), 
    vec3(1,3,1), 
    vec3(2,3,1), 
    vec3(4,5,0),
    vec3(4,6,0),
    vec3(5,7,0),
    vec3(8,9,3),
    vec3(8,10,3),
    vec3(9,11,3),
    vec3(10,11,3),
    vec3(12,14,2),
    vec3(14,13,2),
    vec3(13,15,2),
    vec3(15,12,2),
    vec3(16,17,2)
);

fn segment_intersect(ro: vec2<f32>, rd: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let v1: vec2<f32> = ro - a;
    let v2: vec2<f32> = b - a;
    let v3: vec2<f32> = vec2<f32>(-rd.y, rd.x);

    let d: f32 = dot(v2, v3);
    let t1: f32 = cross(vec3<f32>(v2, 0.0), vec3<f32>(v1, 0.0)).z / d;
    let t2: f32 = dot(v1, v3) / d;

    if (t1 >= 0.0 && (t2 >= 0.0 && t2 <= 1.0)) {
        return t1;
    }
    return 1000.0;
}

fn scene_intersect(ro: vec2<f32>, rd: vec2<f32>) -> vec4<f32> {
    var v0: f32 = 1000.0;
    var col: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for (var i = 0; i < 16; i = i + 1) {
        let a: vec2<f32> = points[segments[i].x];
        let b: vec2<f32> = points[segments[i].y];

        let v1: f32 = segment_intersect(ro, rd, a, b);
        if (v1 < v0) {
            col = materials[segments[i].z];
            v0 = v1;
        }
    }
    return vec4<f32>(col, v0);
}

fn line(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 { 
    var pp = p - a;
    var bb = b - a;
    let h: f32 = clamp(dot(pp, bb) / dot(bb, bb), 0.0, 1.0);
    return length(pp - bb * h);
}

fn scene_dist(p: vec2<f32>) -> vec4<f32> {
    var v0: f32 = 1000.0;
    var col: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for (var i = 0; i < 16; i = i + 1) {
        let a: vec2<f32> = points[segments[i].x];
        let b: vec2<f32> = points[segments[i].y];

        let v1: f32 = line(p, a, b);
        if (v1 < v0) {       
            col = materials[segments[i].z];
            v0 = v1;
        }
    }
    return vec4<f32>(col, v0);
}
fn interleaved_gradient_noise(pixel_coordinates: vec2<f32>) -> f32 {
    let frame = f32(uniforms.frame % 64u);
    let xy = pixel_coordinates + 5.588238 * frame;
    return fract(52.9829189 * fract(0.06711056 * xy.x + 0.00583715 * xy.y));
}

fn scene_normal(p: vec2<f32>) -> vec2<f32> {
    let epsilon: vec2<f32> = vec2<f32>(0.001, -0.001);
    return normalize(vec2<f32>(scene_dist(p + epsilon.xx).w) - vec2<f32>(scene_dist(p - epsilon.xy).w, scene_dist(p - epsilon.yx).w));
}

fn aces(x: vec3<f32>) -> vec3<f32> {
    let a: f32 = 2.51;
    let b: f32 = 0.03;
    let c: f32 = 2.43;
    let d: f32 = 0.59;
    let e: f32 = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let screen_size = textureDimensions(screen);

    if (id.x >= screen_size.x || id.y >= screen_size.y) { return; }

    let frag_coord = vec2f(f32(id.x) + .5, f32(screen_size.y - id.y) - .5);
    let p: vec2<f32> = (2.0 * frag_coord - vec2f(screen_size) - 0.5) / f32(screen_size.x);

    let rand = interleaved_gradient_noise(frag_coord.xy);
    
    var spot: vec3<f32>;
    var gi: vec3<f32>;

    let light_pos: vec2<f32> = uniforms.player.xy;
    var light_dir: vec2<f32> = normalize(uniforms.player.zw - light_pos+ vec2f(0., sin(uniforms.elapsed * 1.5) * 0.01));

    let light_falloff = uniforms.LIGHT_FALLOFF * 3.0;

    if (scene_intersect(p, normalize(light_pos - p)).w > distance(p, light_pos)) {
        spot = vec3<f32>(max((0.5 * dot(normalize(p - light_pos), light_dir) - 0.5) / uniforms.LIGHT_RADIUS + 1.0, 0.0));
    }

    var hit: vec2<f32>;
    for (var i = 0; i < SAMPLES; i = i + 1) {
        var ray_origin: vec2<f32> = light_pos;
        let rot: f32 = 0.08 * PI * ((f32(i) + rand) / f32(SAMPLES) - 0.5) + atan2(light_dir.y, light_dir.x);
        var ray_direction = vec2<f32>(cos(rot), sin(rot));
        let light_dir_sampled = ray_direction;

        var dist: f32 = scene_intersect(ray_origin, ray_direction).w;
        hit = ray_origin + ray_direction * dist;
        let normal: vec2<f32> = scene_normal(hit - ray_direction * 0.01);

        ray_origin = p;
        ray_direction = normalize(hit - p);
        let hit_dist: f32 = min(distance(p, hit) / light_falloff, 1.0);

        var light_ray: vec4<f32> = scene_intersect(ray_origin, ray_direction);
        dist = light_ray.w;

        if (dist + 0.01 > distance(p, hit)) {
            var contribution = 1.0;
            if scene_dist(p).w < .005 {
                contribution = dot(scene_normal(p), light_dir_sampled) * 0.5 + 0.5;
            }

            gi += 1.0 / f32(SAMPLES) * light_ray.rgb * clamp(dot(-ray_direction, normal), 0.0, 1.0) * (1.0 - sqrt(2.0 * hit_dist - hit_dist * hit_dist)) * contribution;
        }
    }

    let scene: vec4<f32> = scene_dist(p);
    var color = spot * 0.5 + gi;
    if scene.w > 0.005 {
        color *= vec3<f32>(0.25);
    } else {
        color *= 3.0 * scene.rgb;
    }
    
    textureStore(screen, id.xy, vec4f(aces(color) + vec3f(smoothstep(0.055, 0.05, length(p - uniforms.player.xy))), 1.));
}
`;

if (!navigator.gpu) {
  throw Error("WebGPU not supported.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw Error("Couldn't request WebGPU adapter.");
}

const device = await adapter.requestDevice({
  requiredFeatures: ["bgra8unorm-storage"],
});

const canvas = document.getElementById("gpuCanvas");
const context = canvas.getContext("webgpu");

context.configure({
  device,
  format: "bgra8unorm",
  alphaMode: "premultiplied",
  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
});

const shaderModule = device.createShaderModule({
  code: shader,
});

const computePipeline = device.createComputePipeline({
  layout: "auto",
  compute: {
    module: shaderModule,
    entryPoint: "main",
  },
});

const uniformBufferSize = 32;
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const uniformBindGroup = device.createBindGroup({
  layout: computePipeline.getBindGroupLayout(1),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    },
  ],
});

let inputkeys = {};
let player = [0.0, 1, 1.0, 0.0, 0.5, 0.005];
let velocity = [0.0, 0.0];

document.addEventListener("keydown", (e) => {
  inputkeys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  inputkeys[e.key] = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  player[2] = ((e.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1;
  player[3] = ((e.clientY - rect.top) / (rect.bottom - rect.top)) * -2 + 1;
});

function dot(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1];
}

function subtract(v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

function add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1]];
}

function multiply(v, scalar) {
  return [v[0] * scalar, v[1] * scalar];
}

function length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function sdfSegment(p, a, b) {
  const h = Math.min(
    1.0,
    Math.max(
      0.0,
      dot(subtract(p, a), subtract(b, a)) / dot(subtract(b, a), subtract(b, a))
    )
  );
  const cp = subtract(p, add(a, multiply(subtract(b, a), h)));
  return { dist: length(cp), cp };
}

const points = [
  [0.1, -0.25],
  [0.3, -0.25],
  [0.1, -0.05],
  [0.3, -0.05],
  [-0.9, -0.8],
  [0.8, -0.8],
  [-0.9, -1.0],
  [0.8, 1.0],
  [-0.4, -0.3],
  [-0.2, -0.3],
  [-0.4, -0.1],
  [-0.2, -0.1],
  [-0.05, -0.05],
  [-0.05, -0.15],
  [0.0, -0.1],
  [-0.1, -0.1],

  [-0, -0.8],
  [0.8, -0.2],
];

const segments = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [4, 5],
  [4, 6],
  [5, 7],
  [8, 9],
  [8, 10],
  [9, 11],
  [10, 11],
  [12, 14],
  [14, 13],
  [13, 15],
  [15, 12],
  [16, 17],
];

function calculateDistance(pos) {
  let distance = 10000;
  let cp = [0, 0];
  for (let i = 0; i < segments.length; i++) {
    const pointA = points[segments[i][0]];
    const pointB = points[segments[i][1]];
    const sdf = sdfSegment(pos, pointA, pointB);
    if (sdf.dist < distance) {
      distance = sdf.dist;
      cp = sdf.cp;
    }
  }
  return { distance, cp };
}

function frame(time) {
  if (inputkeys["q"]) {
    player[4] -= 0.01;
  }
  if (inputkeys["e"]) {
    player[4] += 0.01;
  }

  if (inputkeys["r"]) {
    player[5] = Math.max(player[5] - 0.001, 0);
  }
  if (inputkeys["f"]) {
    player[5] += 0.001;
  }

  if (inputkeys["a"]) {
    velocity[0] = Math.max(velocity[0] - 0.015, -0.01);
  }
  if (inputkeys["d"]) {
    velocity[0] = Math.min(velocity[0] + 0.015, 0.01);
  }

  velocity[0] -= velocity[0] * 0.1;
  velocity[1] = Math.max(velocity[1] - 0.0001, -0.01);

  player[0] += velocity[0];
  player[1] += velocity[1];

  const sdf = calculateDistance([player[0], player[1]]);
  if (sdf.distance < 0.05) {
    player[0] += sdf.cp[0] * (0.05 - sdf.distance) * 32;
    player[1] += sdf.cp[1] * (0.05 - sdf.distance) * 32;
    if (sdf.cp[1] < -0.01) velocity[1] = 0;

    if (inputkeys[" "]) {
      velocity[1] = 0.01;
    }
  }

  const buffer = new Float32Array([...player, time / 1000, time]).buffer;
  device.queue.writeBuffer(uniformBuffer, 0, buffer, 0, buffer.byteLength);

  const bindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: context.getCurrentTexture().createView(),
      },
    ],
  });

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.setBindGroup(1, uniformBindGroup);
  passEncoder.dispatchWorkgroups(
    Math.ceil(canvas.width / 16),
    Math.ceil(canvas.height / 16)
  );
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
