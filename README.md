
# GradeNova — GitHub Pages + Render

GradeNova is a teacher dashboard with an AI grading backend. GitHub Pages hosts the frontend, while Render runs the Python API.

## Project files

- `index.html` — website interface
- `style.css` — responsive layout and themes
- `script.js` — navigation, grading, history, rubrics, and settings
- `server.py` — Flask API connected to Gemini
- `requirements.txt` — Python dependencies
- `README.md` — setup instructions

## 1. Upload the files to GitHub

1. Open your GradeNova GitHub repository.
2. Replace the existing files with these versions.
3. Keep all files in the repository root.
4. Commit the changes to your default branch.

## 2. Deploy the backend on Render

1. Sign in at https://render.com/.
2. Select New → Web Service.
3. Connect your GradeNova GitHub repository.
4. Select Python as the runtime if prompted.
5. Set the build command:

   pip install -r requirements.txt

6. Set the start command:

   gunicorn server:app

7. Add these environment variables in Render:

   - GEMINI_API_KEY = your private Gemini API key
   - GEMINI_MODEL = gemini-2.5-flash
   - ALLOWED_ORIGINS = your GitHub Pages website origin

For a project site such as https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/, the origin is https://YOUR-USERNAME.github.io. Do not include the repository path or a trailing slash.

8. Deploy the service and wait until it is live.
9. Copy the actual service URL provided by Render.

Never put your Gemini API key in index.html, script.js, or a public GitHub file.

## 3. Publish the frontend with GitHub Pages

1. Open your repository's Settings → Pages.
2. Under Build and deployment, select Deploy from a branch.
3. Select your default branch and the /(root) folder.
4. Save and wait for the deployment.
5. Open the published site using GitHub's Visit site link.

## 4. Connect the website to Render

1. Open GradeNova.
2. Navigate to Settings.
3. Find Backend connection.
4. Paste the actual base URL provided by Render, for example https://YOUR-SERVICE.onrender.com.
5. Click Save connection.
6. Click Test connection.
7. When the connection succeeds, open AI Grading and try a test submission.

The backend URL must be the service's base URL. Do not append /api/grade.

## 5. Test the backend

Open this address using your real Render URL:

https://YOUR-SERVICE.onrender.com/api/health

A working backend should return JSON with "ok": true.

## Troubleshooting

- Backend not connected: save the actual Render URL in Settings.
- CORS error: check that ALLOWED_ORIGINS exactly matches your GitHub Pages origin.
- Missing API key: add GEMINI_API_KEY in Render's environment settings.
- Gemini quota error: check your Google AI Studio usage limits.
- Invalid response: make sure Render deployed the matching server.py and requirements.txt.
- Slow first request: a service on a free hosting plan may need time to wake up.

## Privacy and responsible grading

Student work is sent to your configured backend and Google's Gemini API. Avoid sending student names, IDs, or sensitive personal information. Reports and rubrics are stored in that browser's local storage and are not automatically synchronized between devices.

AI grading can be wrong or biased. Review and adjust every draft before recording or sharing a grade.
