# 📄 DocuFlow: VTU Internship Report Automator

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Docxtemplater](https://img.shields.io/badge/docxtemplater-blue.svg?style=for-the-badge)

DocuFlow is a modern, end-to-end React application designed to completely automate the tedious process of writing and formatting Visvesvaraya Technological University (VTU) internship reports. 

Instead of manually formatting 12 weeks of daily logs in Microsoft Word, students can input their basic details, generate a smart AI prompt to extrapolate their notes, and instantly download a 100% college-compliant `.docx` file.

## ✨ Features

- **3-Step Smart Wizard:** A sleek, guided UI/UX for collecting Cover Page details, Schedule information, and JSON data.
- **AI Prompt Generation:** Dynamically calculates exact working days (excluding Sundays) and generates a strict prompt for ChatGPT to extrapolate weekly notes into daily logs.
- **Pixel-Perfect Document Injection:** Uses `docxtemplater` to inject JSON data directly into an official Word template, preserving all fonts, margins, and alignments perfectly.
- **Modern SaaS UI:** Features an interactive Bento-grid landing page, glowing gradient aesthetics, and responsive CSS animations.

## 🚀 Tech Stack

- **Frontend:** React.js (Vite)
- **Styling:** Custom Vanilla CSS (Modern SaaS Aesthetic)
- **Document Processing:** `docxtemplater`, `pizzip`
- **File Handling:** `file-saver`
- **Icons:** FontAwesome 6

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Shreyas445/VTU-Internship-Report-filler.git](https://github.com/Shreyas445/VTU-Internship-Report-filler.git)
   cd VTU-Internship-Report-filler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Template Setup**
   Ensure your college's official Word template (`template-frontpage.docx`) is placed inside the `/public` folder. The template must use standard `{tags}` (e.g., `{student_name}`, `{#weekly_logs}`).

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## 💡 How It Works

1. **Cover Page:** User inputs their name, USN, guide details, and engineering branch.
2. **Schedule & Logs:** User inputs their start/end dates, working days, and rough notes. The app calculates the exact days and generates an AI Prompt.
3. **Generation:** The user pastes the generated JSON from ChatGPT. The app maps this flat JSON into a structured 12-week nested array and injects it into the `.docx` template.

## 🌐 The VTU Automation Ecosystem

This project is part of a larger ecosystem of automation tools designed for engineering students:
* [Internship Report Automator](https://github.com/Shreyas445/VTU-Internship-Report-filler)
* [Internship Diary Bot](https://github.com/Shreyas445/VTU-Internship-diary-Automation)
* [Project Diary Automation](https://github.com/Shreyas445/VTU-Project-Diary-Automation)
* [Course Progress Filler](https://github.com/Shreyas445/VTU-Course-Filler)

## 👨‍💻 Author

Built with precision by **[Shreyas K S](https://github.com/Shreyas445)**.