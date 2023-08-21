

function webGPUTextureFromImageBitmapOrCanvas(gpuDevice, source) {
    const textureDescriptor = {
        size: { width: source.width, height: source.height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    };
    const texture = gpuDevice.createTexture(textureDescriptor);

    gpuDevice.queue.copyExternalImageToTexture({ source }, { texture }, textureDescriptor.size);

    return texture;
}

export async function webGPUTextureFromImageUrl(gpuDevice, url) { // Note that this is an async function
    const response = await fetch(url);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    return webGPUTextureFromImageBitmapOrCanvas(gpuDevice, imgBitmap);
}