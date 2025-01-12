require("dotenv").config();
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const { createWorker } = require("tesseract.js"); // OCR library

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

    // const worker = await createWorker("eng");
    const worker = await createWorker("deu");
    const { data } = await worker.recognize(fileLink.href);
    // console.log(ret.data.text);
    await worker.terminate();
    const recognizedText = data.text;

    // Step 4: Extract "Preis" and "Liter" values
    const priceMatch = recognizedText.match(/preis\s*[:\s]*([\d.,]+)/i);
    const literMatch = recognizedText.match(/liter\s*[:\s]*([\d.,]+)/i);
    const dateMatch = recognizedText.match(/datum\s*[:\s]*([\d.,]+)/i);

    const price = priceMatch ? priceMatch[1] : "Not found";
    const liters = literMatch ? literMatch[1] : "Not found";
    const date = dateMatch ? dateMatch[1] : "Not found";

    // Step 5: Reply with the extracted data
    await ctx.reply(
      `Preis: ${price}\nLiter: ${liters}\nDatum: ${date}`
    );
    await ctx.reply(data.text);
  } catch (error) {
    console.error(error);
    await ctx.reply("Failed to process the photo. Please try again.");
  }
});

// Launch the bot
bot.launch().then(() => console.log("Bot is running!"));
