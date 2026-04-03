import { toast } from "react-hot-toast"
import { apiConnector } from "../apiConnector"
import { quizEndpoints } from "../apis"
import { setCurrentQuiz, setQuizResult, setQuizLoading } from "../../slices/quizSlice"
import { setCourse } from "../../slices/courseSlice"

const {
  CREATE_QUIZ_API,
  UPDATE_QUIZ_API,
  DELETE_QUIZ_API,
  GET_QUIZ_DETAILS_API,
  SUBMIT_QUIZ_API,
  GET_QUIZ_RESULT_API,
} = quizEndpoints


// ---- Instructor: Create Quiz ----
export const createQuiz = async (data, token) => {
  let result = null
  const toastId = toast.loading("Creating quiz...")
  try {
    const response = await apiConnector("POST", CREATE_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)
    result = response.data.data
    toast.success("Quiz created successfully")
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not create quiz")
  }
  toast.dismiss(toastId)
  return result
}


// ---- Instructor: Update Quiz ----
export const updateQuiz = async (data, token) => {
  let result = null
  const toastId = toast.loading("Updating quiz...")
  try {
    const response = await apiConnector("POST", UPDATE_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)
    result = response.data.data
    toast.success("Quiz updated successfully")
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not update quiz")
  }
  toast.dismiss(toastId)
  return result
}


// ---- Instructor: Delete Quiz ----
export const deleteQuiz = async (data, token, course, dispatch) => {
  const toastId = toast.loading("Deleting quiz...")
  try {
    const response = await apiConnector("POST", DELETE_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)

    // update course in redux
    const updatedCourseContent = course.courseContent.map((section) =>
      section._id === data.sectionId ? response.data.data : section
    )
    dispatch(setCourse({ ...course, courseContent: updatedCourseContent }))
    toast.success("Quiz deleted")
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not delete quiz")
  }
  toast.dismiss(toastId)
}


// ---- Student: Load Quiz ----
export const loadQuiz = (quizId, token) => async (dispatch) => {
  dispatch(setQuizLoading(true))
  try {
    const response = await apiConnector("POST", GET_QUIZ_DETAILS_API, { quizId }, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)
    dispatch(setCurrentQuiz(response.data.data))
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not load quiz")
  }
  dispatch(setQuizLoading(false))
}


// ---- Student: Submit Quiz ----
export const submitQuiz = (data, token) => async (dispatch) => {
  dispatch(setQuizLoading(true))
  try {
    const response = await apiConnector("POST", SUBMIT_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)
    dispatch(setQuizResult(response.data.data))
    toast.success(response.data.message)
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not submit quiz")
  }
  dispatch(setQuizLoading(false))
}


// ---- Student/Instructor: Get past result ----
export const loadQuizResult = (quizId, token) => async (dispatch) => {
  dispatch(setQuizLoading(true))
  try {
    const response = await apiConnector("POST", GET_QUIZ_RESULT_API, { quizId }, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error(response.data.message)
    if (response.data.data) {
      dispatch(setQuizResult(response.data.data))
    }
  } catch (error) {
    console.error("Could not load quiz result", error)
  }
  dispatch(setQuizLoading(false))
}
