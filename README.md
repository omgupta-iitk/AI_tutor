I designed and built a **voice-based AI tutor web application** as a freelance project for an Australian startup. The product was an interactive learning platform where students could engage in **realtime, spoken dialogue** with an AI tutor that generated and explained educational content.

---
### 🔧 **Architecture & Tools Used:**
- **Frontend**: Built with **React**, compiled into static assets (HTML/CSS/JS).
- **Backend**: A **Node.js** service with **WebSocket** support to stream audio packets in realtime for seamless two-way communication.
- **AI Services**: 
  - **Claude 3.5 Sonnet** for generating slide scaffolds based on subject, topic, and grade.
  - **OpenAI GPT-4o (preview)** for realtime Q&A, explanation, and voice-based tutoring.
  - **OpenAI Function Calling** to dynamically shift context, e.g., navigating to relevant slides mid-conversation and returning to the original flow.

### **Core Features:**
1. Slide generation via prompt-based input using Claude 3.5.
2. Human-in-the-loop feedback before finalizing slides.
3. Realtime voice tutoring referencing the slides.
4. Bi-directional speech-to-speech Q&A with context switching.
5. Context-aware slide navigation using function calling.

### 🚀 **Scalability Strategy:**
- **Frontend** hosted on **AWS CloudFront** to ensure low latency and high availability.
- **Backend** deployed on **AWS EC2 Auto Scaling Groups** behind a **Load Balancer** to handle concurrent sessions and scale based on CPU/memory metrics.
- Used **S3** for static asset storage and **Route 53** for DNS management.
- Optionally containerized backend with **Docker**, and can be extended with **ECS or EKS** for orchestration if scaling demands grow.

This architecture ensured low-latency audio streaming, cost-efficient scaling, and high availability—all critical for a smooth, interactive learning experience.

Here is the working video of the same:
(Note: **Use headphones with high volume** to listen to the doubts asked by me at the end and check how the tutor changes the slide according to the question asked)


https://github.com/user-attachments/assets/4dff83a7-764a-4df5-9493-b2ae267efc0b

