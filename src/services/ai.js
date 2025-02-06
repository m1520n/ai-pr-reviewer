import OpenAI from 'openai';
import { extractCodeFromPatch } from '../utils/patch.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Use environment variable for model with fallback
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_TOKENS_ANALYSIS = 500;
const MAX_TOKENS_DESCRIPTION = 1000;

const aiService = {
  async generatePRDescription(files) {
    try {
      console.log('Generating PR description for', files.length, 'files');
      
      // Prepare a summary of changes for each file
      const fileChanges = files.map(file => {
        const { code } = extractCodeFromPatch(file.patch);
        return `File: ${file.filename}\nChanges:\n${code}\n`;
      }).join('\n---\n');

      const prompt = `As a technical writer, create a clear and professional pull request description based on the following code changes. 
      Include:
      1. A brief summary of the changes
      2. Key modifications and their purpose
      3. Any notable technical details
      4. Testing considerations (if applicable)

      Format the description in markdown.
      
      Changes to analyze:
      ${fileChanges}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: MAX_TOKENS_DESCRIPTION,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating PR description:', error);
      return '**Error**: Unable to generate PR description automatically.';
    }
  },

  async analyzeFile(file) {
    try {
      console.log(`Analyzing file: ${file.filename}`);
      const { code, lineMapping } = extractCodeFromPatch(file.patch);
      
      if (!code.trim()) {
        console.log(`Skipping empty file: ${file.filename}`);
        return {
          filename: file.filename,
          analysis: ''
        };
      }

      const prompt = `Review this code change (be concise):
        ${file.filename}:
        ${code}

        List only critical issues (security, major bugs, severe performance):
        Format each as: "LINE <number>: [<type>] <brief_issue>"
      `;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: MAX_TOKENS_ANALYSIS,
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
      console.log(`Analysis completed for ${file.filename}`);
      return result;
    } catch (error) {
      console.error(`Error analyzing file ${file.filename}:`, error);
      return {
        filename: file.filename,
        analysis: `Error analyzing file: ${error.message}`
      };
    }
  },

  async analyzeFiles(files) {
    console.log(`Starting analysis of ${files.length} files`);
    const results = await Promise.all(files.map(file => this.analyzeFile(file)));
    return results.filter(result => result.analysis); // Filter out empty analyses
  }
};

export default aiService;
