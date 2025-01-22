require("dotenv").config();
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const { createWorker } = require("tesseract.js"); // OCR library
const fetch = require("node-fetch");
const { HfInference } = require("@huggingface/inference");
const client = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Initialize bot and OCR pipeline
const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command
bot.start((ctx) =>
  ctx.reply(
    "Welcome! Send me a photo of your bill, and I'll extract the price and liters."
  )
);

// Help command
bot.help((ctx) =>
  ctx.reply("Send me a photo of a bill to extract the price and liters.")
);

// Handle photo messages
bot.on(message("photo"), async (ctx) => {
  const photo = ctx.message.photo.pop(); // Get the highest resolution photo
  const fileId = photo.file_id;

  // Step 2: Confirm receipt
  await ctx.reply("Photo received! Processing...");

  try {
    // Step 3: Download photo
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const extractedData = await makeRequest(fileLink.href);

    // const price = extractedData.match(/gesamtbetrag\s*[:\s]*([\d.,]+)/i);
    // console.log("price:", price);

    // Final step : Reply with the extracted data
    await ctx.reply(`Extracted Information:\n${extractedData}`);
  } catch (error) {
    console.error("\n\nError during photo processing\n\n", error.message);
    await ctx.reply(
      "Failed to process the photo. Please try again./\n\n",
      `Error: ${error.message}`
    );
  }
});

const makeRequest = async (link) => {
  try {
    const chatCompletion = await client.chatCompletion({
      model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Take the text of the image of the receipt of the gas station and extract the information of the amount, price that I pay for everything, quantity of the litre, price of a litre, then type of fuel, date of this and the address of the gas station and give the extracted data in the JSON Format object and it is very important to have this propertys in JSON Object because it will be uploaded in DB. This object must look like this: 
                {"amount":"number", "quantity":"number", "fuel": "string", "price":"number", "date":"DD.MM.YYYY", "station":"string"} and just give me this object and nothing more. No comments, notes or explanations from you.`,
            },
            {
              type: "image_url",
              image_url: {
                url: link,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });
    // Extract content from response
    const content = chatCompletion.choices[0].message.content;
    console.log("Hugging Face API Response:", content);
    // validateJSON(content);
    return content;
  } catch (error) {
    console.error("Hugging Face API Error:", error);
    throw new Error("Failed to process image using Hugging Face API.");
  }
};

// Function: Validate JSON
const validateJSON = (data) => {
  try {
    JSON.parse(data); // Check if data is valid JSON
  } catch (error) {
    throw new Error("Invalid JSON format returned from the API.");
  }
};

// Launch the bot
bot.launch().then(() => console.log("Bot is running!"));
// Graceful shutdown for the bot
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
