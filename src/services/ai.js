const OpenAI = require('openai');
const { extractCodeFromPatch } = require('../utils/patch');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const model = "gpt-4o-mini";

const aiService = {
  async analyzeFile(file) {
    try {
      console.log(`Analyzing file: ${file.filename}`);
      const { code, lineMapping } = extractCodeFromPatch(file.patch);
      
      const prompt = `Review this code change (be concise):
${file.filename}:
${code}

List only critical issues (security, major bugs, severe performance):
Format each as: "LINE <number>: [<type>] <brief_issue>"`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      // Map the AI response line numbers back to original file line numbers
      let analysis = completion.choices[0].message.content;
      for (let [outputLine, originalLine] of lineMapping.entries()) {
        const pattern = new RegExp(`LINE ${outputLine + 1}:`, 'g');
        analysis = analysis.replace(pattern, `LINE ${originalLine}:`);
      }

      const result = {
        filename: file.filename,
        analysis
      };
      console.log(`Analysis completed for ${file.filename}:`, result);
      return result;
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