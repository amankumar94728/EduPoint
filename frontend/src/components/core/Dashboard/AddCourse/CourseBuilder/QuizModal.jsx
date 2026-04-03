import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { RxCross2 } from "react-icons/rx"
import { FaPlus, FaTrash } from "react-icons/fa"
import { MdCheckCircle } from "react-icons/md"
import { toast } from "react-hot-toast"

import { createQuiz, updateQuiz } from "../../../../../services/operations/quizAPI"
import { setCourse } from "../../../../../slices/courseSlice"


const emptyQuestion = () => ({
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
})


export default function QuizModal({ sectionId, existingQuiz, setModalData }) {
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { course } = useSelector((state) => state.course)

  const [title, setTitle] = useState(existingQuiz?.title || "")
  const [description, setDescription] = useState(existingQuiz?.description || "")
  const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore ?? 60)
  const [questions, setQuestions] = useState(
    existingQuiz?.questions?.length
      ? existingQuiz.questions.map((q) => ({
          questionText: q.questionText,
          options: [...q.options],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
        }))
      : [emptyQuestion()]
  )
  const [loading, setLoading] = useState(false)

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()])

  const removeQuestion = (qIdx) => {
    if (questions.length === 1) {
      toast.error("A quiz must have at least one question")
      return
    }
    setQuestions((prev) => prev.filter((_, i) => i !== qIdx))
  }

  const updateQuestion = (qIdx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, [field]: value } : q))
    )
  }

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const newOptions = [...q.options]
        newOptions[oIdx] = value
        return { ...q, options: newOptions }
      })
    )
  }

  const addOption = (qIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, ""] } : q
      )
    )
  }

  const removeOption = (qIdx, oIdx) => {
    const q = questions[qIdx]
    if (q.options.length <= 2) {
      toast.error("At least 2 options are required")
      return
    }
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const newOptions = q.options.filter((_, oi) => oi !== oIdx)
        const newCorrect = q.correctAnswer >= oIdx && q.correctAnswer > 0
          ? q.correctAnswer - 1
          : q.correctAnswer
        return { ...q, options: newOptions, correctAnswer: newCorrect }
      })
    )
  }

  const validate = () => {
    if (!title.trim()) { toast.error("Quiz title is required"); return false }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText.trim()) { toast.error(`Question ${i + 1}: question text is required`); return false }
      if (q.options.some((o) => !o.trim())) { toast.error(`Question ${i + 1}: all options must be filled`); return false }
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        toast.error(`Question ${i + 1}: invalid correct answer`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)

    let updatedSection = null

    if (existingQuiz) {
      // update
      await updateQuiz({ quizId: existingQuiz._id, title, description, questions, passingScore }, token)
      // refresh section data manually
      updatedSection = course.courseContent.map((sec) => {
        if (sec._id !== sectionId) return sec
        return {
          ...sec,
          quiz: { ...existingQuiz, title, description, questions, passingScore },
        }
      })
    } else {
      // create
      const result = await createQuiz({ sectionId, title, description, questions, passingScore }, token)
      if (result) {
        updatedSection = course.courseContent.map((sec) =>
          sec._id === sectionId ? result : sec
        )
      }
    }

    if (updatedSection) {
      dispatch(setCourse({ ...course, courseContent: updatedSection }))
    }

    setLoading(false)
    setModalData(null)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 overflow-y-auto py-10">
      <div className="relative mx-auto w-full max-w-3xl rounded-2xl bg-richblack-800 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-richblack-5">
            {existingQuiz ? "Edit Quiz" : "Add Quiz"}
          </h2>
          <button onClick={() => setModalData(null)}>
            <RxCross2 className="text-2xl text-richblack-300 hover:text-white" />
          </button>
        </div>

        {/* Quiz meta */}
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-richblack-200">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Section 1 Quiz"
              className="mt-1 w-full rounded-lg bg-richblack-700 px-4 py-2.5 text-richblack-5 outline-none border border-richblack-600 focus:border-yellow-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-richblack-200">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this quiz"
              className="mt-1 w-full rounded-lg bg-richblack-700 px-4 py-2.5 text-richblack-5 outline-none border border-richblack-600 focus:border-yellow-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-richblack-200">Passing Score (%) *</label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="mt-1 w-32 rounded-lg bg-richblack-700 px-4 py-2.5 text-richblack-5 outline-none border border-richblack-600 focus:border-yellow-50"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-6">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="rounded-xl border border-richblack-600 bg-richblack-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="font-semibold text-richblack-100">Question {qIdx + 1}</span>
                <button onClick={() => removeQuestion(qIdx)}>
                  <FaTrash className="text-red-400 hover:text-red-300" />
                </button>
              </div>

              {/* Question text */}
              <input
                type="text"
                value={q.questionText}
                onChange={(e) => updateQuestion(qIdx, "questionText", e.target.value)}
                placeholder="Enter question text"
                className="w-full rounded-lg bg-richblack-600 px-4 py-2 text-richblack-5 outline-none border border-richblack-500 focus:border-yellow-50 mb-4"
              />

              {/* Options */}
              <p className="text-xs font-medium text-richblack-300 mb-2">Options (click circle to mark correct answer)</p>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIdx, "correctAnswer", oIdx)}
                      className={`shrink-0 rounded-full p-0.5 transition-colors ${
                        q.correctAnswer === oIdx ? "text-green-400" : "text-richblack-500 hover:text-richblack-200"
                      }`}
                      title="Mark as correct"
                    >
                      <MdCheckCircle size={20} />
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                      className="flex-1 rounded-lg bg-richblack-600 px-3 py-1.5 text-sm text-richblack-5 outline-none border border-richblack-500 focus:border-yellow-50"
                    />
                    <button onClick={() => removeOption(qIdx, oIdx)} title="Remove option">
                      <RxCross2 className="text-richblack-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addOption(qIdx)}
                className="mt-2 flex items-center gap-1 text-xs text-yellow-50 hover:text-yellow-25"
              >
                <FaPlus size={10} /> Add Option
              </button>

              {/* Explanation */}
              <div className="mt-3">
                <label className="text-xs text-richblack-300">Explanation (shown after submission)</label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)}
                  placeholder="Optional: explain why the correct answer is right"
                  className="mt-1 w-full rounded-lg bg-richblack-600 px-3 py-1.5 text-sm text-richblack-5 outline-none border border-richblack-500 focus:border-yellow-50"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Question */}
        <button
          onClick={addQuestion}
          className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-richblack-500 px-4 py-2.5 text-sm text-yellow-50 hover:border-yellow-50 w-full justify-center"
        >
          <FaPlus /> Add Question
        </button>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setModalData(null)}
            className="rounded-lg border border-richblack-600 px-5 py-2 text-sm text-richblack-200 hover:bg-richblack-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-yellow-50 px-6 py-2 text-sm font-semibold text-richblack-900 hover:bg-yellow-25 disabled:opacity-60"
          >
            {loading ? "Saving..." : existingQuiz ? "Update Quiz" : "Create Quiz"}
          </button>
        </div>
      </div>
    </div>
  )
}
