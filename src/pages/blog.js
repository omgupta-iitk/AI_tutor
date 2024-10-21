import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

function SlideReq({ onGenerate }) {
  const location = useLocation();
  const data = useMemo(() => location.state, [location]);

  const [formdata, setFormData] = useState({
    totalSlides: 6,
    lessonType: "",
    slideRequirements: [{ id: 1, req: "" }],
    tutorRequirements: [{ id: 1, req: "" }],
  });

  useEffect(() => {
    if (data.lessonType) {
      setFormData((prev) => ({
        ...prev,
        lessonType: data.lessonType,
      }));
    }
  }, [data]);

  const handleChange = (e, type, index) => {
    const { name, value } = e.target;

    if (type) {
      // If updating slide or tutor requirements
      const updatedList = [...formdata[type]];
      updatedList[index].req = value;
      setFormData({ ...formdata, [type]: updatedList });
    } else {
      // General input handling (e.g., lessonType)
      setFormData({ ...formdata, [name]: value });
    }
  };

  // Add a new requirement dynamically
  const addRequirements = () => {
    // Use a function to get the latest formdata
    setFormData((prevFormData) => {
      const newSlideReq = {
        id: prevFormData.slideRequirements.length + 1,
        req: "",
      };
      const newTutorReq = {
        id: prevFormData.tutorRequirements.length + 1,
        req: "",
      };

      return {
        ...prevFormData,
        slideRequirements: [...prevFormData.slideRequirements, newSlideReq],
        tutorRequirements: [...prevFormData.tutorRequirements, newTutorReq],
      };
    });
  };
  const handleNextArrow = () => {
    if (slideState < formdata.totalSlides) {
      addRequirements();
      setSlideState((prev) => prev + 1);
    }
  };

  const handleBackArrow = () => {
    if (slideState > 1) {
      setSlideState((prev) => prev - 1);
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formdata); // Send form data to the parent (App.js) to generate scaffold
  };

  const [slideState, setSlideState] = useState(1);

  return (
    <form className="lesson-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Lesson Scaffold - {slideState} of 15 slides</label>
        <select
          name="lessonType"
          value={formdata.lessonType}
          onChange={handleChange}
        >
          <option>{formdata.lessonType}</option>
        </select>
      </div>
      <div className="form-group">
        <label>Slide Requirements</label>
        <textarea
          name="slide"
          value={formdata.slideRequirements[slideState - 1].req}
          onChange={(e) => handleChange(e, "slideRequirements", slideState - 1)}
        />
      </div>
      <div className="form-group">
        <label>Tutor Requirements</label>
        <textarea
          name="tutorReq"
          value={formdata.tutorRequirements[slideState - 1].req}
          onChange={(e) => handleChange(e, "tutorRequirements", slideState - 1)}
        />
      </div>
      <button type="button" onClick={handleNextArrow} className="next-button">
        Next slide
      </button>
      <button type="button" onClick={handleBackArrow} className="next-button">
        Back slide
      </button>
      <button type="submit" className="generate-button">
        Generate lesson slides
      </button>
    </form>
  );
}

export default SlideReq;
