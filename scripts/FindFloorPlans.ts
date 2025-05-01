import Replicate from "replicate";

const replicate = new Replicate();

const findFloorPlans = async (imageBuffer: Buffer) => {
  const response = await replicate.run("stability-ai/stable-diffusion-3", {
    input: {
      image: imageBuffer,
    },
  });

  console.log(response);
};
