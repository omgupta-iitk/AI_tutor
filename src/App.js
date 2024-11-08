import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import "./App.css";
import LessonForm from "./LessonForm";
import MagicCoach from "./MagicCoach";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Blogs from "./pages/blog";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
// import { useNavigate } from "react-router-dom";
import { ConsolePage } from "./ConsolePage.tsx";
// import SlideReq from "./pages/blog";
// import SlideRequirementsPage from './SlideRequirementsPage';

const SlideRenderer = ({ htmlContent }) => {
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
  const [selectedSlides, setSelectedSlides] = useState([]);
  const [totalSlides, setTotalSlides] = useState(0);
  const totalSlidesRef = React.useRef(totalSlides);
  useEffect(() => {
    totalSlidesRef.current = totalSlides;
  }, [totalSlides]);

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

  // const handleCheckboxChange = (index) => {
  //   setSelectedSlides((prevSelected) =>
  //     prevSelected.includes(index)
  //       ? prevSelected.filter((i) => i !== index)
  //       : [...prevSelected, index]
  //   );
  //   setTotalSlides(selectedSlides.length);
  // };
  const handleCheckboxChange = (slideContent) => {
    setSelectedSlides((prevSelected) =>
      prevSelected.includes(slideContent)
        ? prevSelected.filter((content) => content !== slideContent)
        : [...prevSelected, slideContent]
    );
    setTotalSlides(selectedSlides.length);
  };

  const handleNextSlide = () => {
    if (slideState + 1 < totalSlidesRef.current) {
      setSlideState((prev) => prev + 1);
    }
  };

  const handleBackSlide = () => {
    if (slideState > 0) {
      setSlideState((prev) => prev - 1);
    }
  };

  const handleSlideGeneration = async (formData) => {
    try {
      if (markdownSlides.length > 0) {
        const newObj = { slides: selectedSlides, totalSlides: selectedSlides.length, ...formData };
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
      return result.slideCode;
    } catch (error) {
      console.error("Error generating slide:", error);
    }
  };

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
                          {/* Checkbox for selecting the slide */}
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedSlides.includes(slide)}
                              onChange={() => handleCheckboxChange(slide)}
                            />
                            Select Slide
                          </label>
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
                      {selectedSlides.map((slide, index) => (
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
          <Route path="/console" element={<ConsolePage data={slideCodes} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
