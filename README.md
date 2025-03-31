# Mental Health Screening Tool

## Overview
A standalone web application for mental health screening, powered by Claude AI and designed for easy WordPress integration.

## Features
- Multi-stage screening process
- AI-powered analysis of responses
- Localized resource recommendations
- Secure, privacy-focused design

## Prerequisites
- Node.js (v14+ recommended)
- Anthropic API Key

## Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/mental-health-screener.git
cd mental-health-screener
```

2. Install dependencies
```bash
npm install
```

3. Configure Environment
- Copy `.env.example` to `.env`
- Add your Anthropic API Key

4. Run the application
```bash
npm run dev  # For development
npm start    # For production
```

## WordPress Integration

### Embedding Options
1. **iFrame Embed**
```html
<iframe 
  src="https://your-screener-domain.com" 
  width="100%" 
  height="800px" 
  frameborder="0"
></iframe>
```

2. **Modal Trigger**
```html
<button onclick="openMentalHealthScreener()">Take Screening</button>

<script>
function openMentalHealthScreener() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;">
      <iframe 
        src="https://your-screener-domain.com" 
        style="width:90%;height:90%;margin:5% auto;display:block;background:white;"
      ></iframe>
    </div>
  `;
  document.body.appendChild(modal);
}
</script>
```

## Deployment
Recommended platforms:
- Vercel
- Netlify
- Render

## Security Considerations
- Keep API keys confidential
- Use HTTPS
- Implement proper CORS settings

## License
[Your License Here]