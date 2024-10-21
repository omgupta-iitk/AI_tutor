import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
import "./App.css";
import LessonForm from "./LessonForm";
import MagicCoach from "./MagicCoach";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Blogs from "./pages/blog";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
// import SlideReq from "./pages/blog";
// import SlideRequirementsPage from './SlideRequirementsPage';

const SlideRenderer = ({ htmlContent }) => {
  // return (
  //   <div
  //     className="confined-container"
  //     style={{ overflow: "auto", maxHeight: "80vh", border: "1px solid #ddd" }}
  //     dangerouslySetInnerHTML={{ __html: htmlContent }}
  //   />
  // );
  return (
    <iframe
      title="Slide Content"
      style={{ width: "100%", height: "80vh", border: "1px solid #ddd" }}
      srcDoc={htmlContent}
    />
  );
};

function App() {
  const [markdownSlides, setMarkdownSlides] = useState([]);
  const [slideCodes, setSlideCodes] = useState([]);
  const [slideState, setSlideState] = useState(0);

  const handleScaffoldGeneration = async (formData) => {
    try {
      const response = await fetch("http://localhost:5000/generate-scaffold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      setMarkdownSlides(result.slides); // Store slides as an array
    } catch (error) {
      console.error("Error generating scaffold:", error);
    }
  };

  const handleNextSlide = () => {
    if (slideState < 6) {
      setSlideState((prev) => prev + 1);
    }
  };

  const handleBackSlide = () => {
    if (slideState > 1) {
      setSlideState((prev) => prev - 1);
    }
  };

  const handleSlideGeneration = async (formData) => {
    try {
      if (markdownSlides.length > 0) {
        const newObj = { slides: markdownSlides, ...formData };
        formData = newObj;
      }
      const response = await fetch(
        "http://localhost:5000/generate-scaffold-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();
      setSlideCodes(result.slideCode); // Store slides as an array
    } catch (error) {
      console.error("Error generating slide:", error);
    }
  };

  // const handleStartLesson = () => {
  //   try {
  //     const response = fetch("http://localhost:5000/start-lesson", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ slide: slideCodes[slideState] }),
  //     });
  //   } catch (error) {}
  // };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="content-area">
                  {markdownSlides.length > 0 ? (
                    <div className="workspace-renderer">
                      {markdownSlides.map((slide, index) => (
                        <div key={index} className="markdown-slide">
                          <h3>Slide {index + 1}</h3>
                          <ReactMarkdown
                            remarkPlugins={remarkGfm}
                            rehypePlugins={[rehypeRaw]}
                            children={slide}
                          />
                          {/* <SlideRenderer htmlContent={slide} /> */}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MagicCoach />
                  )}
                </div>
                <div className="form-area">
                  <LessonForm onGenerate={handleScaffoldGeneration} />
                </div>
              </>
            }
          />
          <Route
            path="/blog"
            element={
              <>
                <div className="content-area">
                  {slideCodes.length > 0 ? (
                    <div className="workspace-renderer">
                      {/* {slideCodes.map((slide, index) => ( */}
                      <div key={slideState} className="markdown-slide">
                        <h3>Slide {slideState + 1}</h3>
                        {/* <ReactMarkdown remarkPlugins={remarkGfm} rehypePlugins={[rehypeRaw]} children={slide}/> */}
                        <SlideRenderer htmlContent={slideCodes[slideState]} />
                      </div>
                      <button
                        type="button"
                        onClick={handleNextSlide}
                        className="next-button"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        onClick={handleBackSlide}
                        className="next-button"
                      >
                        Back
                      </button>
                      {/* <button
                        type="button"
                        onClick={handleStartLesson}
                        className="next-button"
                      >
                        Start Lesson
                      </button> */}
                    </div>
                  ) : (
                    <div className="workspace-renderer">
                      {markdownSlides.map((slide, index) => (
                        <div key={index} className="markdown-slide">
                          <h3>Slide {index + 1}</h3>
                          <ReactMarkdown
                            remarkPlugins={remarkGfm}
                            rehypePlugins={[rehypeRaw]}
                            children={slide}
                          />
                          {/* <SlideRenderer htmlContent={slide} /> */}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-area">
                  <Blogs onGenerate={handleSlideGeneration} />
                </div>
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
