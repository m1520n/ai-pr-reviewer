const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const aiService = {
  async analyzeFile(file) {
    try {
      console.log(`Analyzing file: ${file.filename}`);
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

      const analysis = {
        filename: file.filename,
        analysis: completion.choices[0].message.content
      };
      console.log(`Analysis completed for ${file.filename}:`, analysis);
      return analysis;
    } catch (error) {
      console.error(`Error analyzing file ${file.filename}:`, error);
      throw error;
    }
  },

  async analyzeFiles(files) {
    console.log(`Starting analysis of ${files.length} files`);
    return Promise.all(files.map(file => this.analyzeFile(file)));
  }
};

module.exports = aiService; 