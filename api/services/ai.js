const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const aiService = {
  async analyzeFile(file) {
    const prompt = `Review this code change (be concise):
${file.filename}:
${file.patch}

List only critical issues (security, major bugs, severe performance):
Format each as: "LINE <number>: [<type>] <brief_issue>"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    return {
      filename: file.filename,
      analysis: completion.choices[0].message.content
    };
  },

  async analyzeFiles(files) {
    return Promise.all(files.map(file => this.analyzeFile(file)));
  }
};

module.exports = aiService; 