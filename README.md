# Honorably - Educational AI Assistant

An educational AI chat application that helps users learn by refusing to give easy answers and instead providing learning resources and guidance.

## 🎯 Features

- **Educational Focus**: Detects "cheating" requests and provides learning resources instead of direct answers
- **Modern UI**: ChatGPT-style interface with React frontend
- **GPT-4o-mini Integration**: Powered by OpenAI's latest model
- **Real-time Chat**: Smooth messaging with typing indicators
- **Responsive Design**: Works on desktop and mobile

## 🏗️ Architecture

- **Frontend**: React with modern hooks and CSS
- **Backend**: Node.js with Express
- **AI**: OpenAI GPT-4o-mini with educational system instructions
- **Styling**: Custom CSS with ChatGPT-inspired design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/honorably-ai.git
cd honorably-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `project.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

4. **Start the backend**
```bash
node backend.js
```

5. **Start the frontend** (in a new terminal)
```bash
npm start
```

6. **Open your browser**
Navigate to `http://localhost:3001`

## 🎓 Educational Philosophy

This AI assistant is designed to promote learning rather than enable academic shortcuts. It:

- Detects requests for direct answers to homework/tests
- Provides learning resources and guidance instead
- Encourages independent problem-solving
- Maintains educational integrity

## 🛠️ Development

### Project Structure
```
honorably-ai/
├── backend.js          # Express server with OpenAI integration
├── package.json        # Dependencies and scripts
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Styling
│   ├── index.js        # React entry point
│   └── index.css       # Global styles
└── public/
    └── index.html      # HTML template
```

### Key Components
- **System Instructions**: Educational AI behavior rules
- **Message Handling**: Real-time chat functionality  
- **Error Handling**: Graceful API error management
- **Responsive Design**: Mobile-friendly interface

## 📚 Learning Resources

This project demonstrates:
- React hooks (useState, useEffect, useRef)
- API integration with axios
- Modern CSS with Flexbox
- Express.js backend development
- OpenAI API implementation
- Educational AI system design

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Important Notes

- Keep your OpenAI API key secure and never commit it to version control
- Monitor your OpenAI usage to manage costs
- This is designed for educational use - please use responsibly
