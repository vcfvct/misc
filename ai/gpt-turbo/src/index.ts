import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";
import * as fs from 'fs';

const ConfigFile = 'local-config.json';

let apiKey = '';

if(fs.existsSync(ConfigFile)){
  apiKey = JSON.parse(fs.readFileSync(ConfigFile).toString('utf8')).apiKey;
}
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || apiKey,
});

const openai = new OpenAIApi(configuration);

(async () => {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.9,
      messages:[{role: 'user', content: 'can you give a brief summarization of book "the curious cat spy club"? '}],
    });
    console.log(completion.data.choices[0].message.content);
  } catch (e) {
    console.error(e)
  }
})();
