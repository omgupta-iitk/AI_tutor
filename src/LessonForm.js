import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const grades = [
  "Kindergarden",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];
const subjects = [
  "English",
  "Math",
  "Science",
  "Social Studies",
  "Art",
  "Music",
  "Physical Education",
  "Health",
  "Computer Science",
  "Foreign Language",
  "Other",
];
const lessonType = ["Introductory", "Intermediate", "Advanced"];
const tutorialType = [
  "Colloquial and fun",
  "Formal and professional",
  "Interactive and engaging",
  "Serious and focused",
];

function LessonForm({ onGenerate }) {
  const [formData, setFormData] = useState({
    grade: "Grade 3",
    subject: "English",
    topic: "Lesson on Sentence Structure",
    lessonType: "Introductory",
    tutorType: "Colloquial and fun",
    rules: `1. No inappropriate discussion\n2. Align to Year Level concept, do not make too complex..`,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const navigate = useNavigate();

  const pageChange = () => {
    navigate("/blog", { state: formData });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formData); // Send form data to the parent (App.js) to generate scaffold
  };

  return (
    <form className="lesson-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Grade Level</label>
        <select name="grade" value={formData.grade} onChange={handleChange}>
          {grades.map((grade) => (
            <option value={grade}>{grade}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Subject Area</label>
        <select name="subject" value={formData.subject} onChange={handleChange}>
          {subjects.map((subject) => (
            <option value={subject}>{subject}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>What is the lesson about?</label>
        <input
          type="text"
          name="topic"
          value={formData.topic}
          onChange={handleChange}
          placeholder="Topic of the lesson"
        />
      </div>
      <div className="form-group">
        <label>Lesson Type</label>
        <select
          name="lessonType"
          value={formData.lessonType}
          onChange={handleChange}
        >
          {lessonType.map((lesson) => (
            <option value={lesson}>{lesson}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Tutor Type</label>
        <select
          name="tutorType"
          value={formData.lessonType}
          onChange={handleChange}
        >
          {tutorialType.map((tutor) => (
            <option value={tutor}>{tutor}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Rules</label>
        <textarea name="rules" value={formData.rules} onChange={handleChange} />
      </div>
      <button type="submit" className="generate-button">
        Generate lesson scaffold
      </button>
      <button className="next-button" onClick={pageChange}>Next</button>
    </form>
  );
}

export default LessonForm;
