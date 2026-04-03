import { useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { FcGoogle } from "react-icons/fc"
import { useDispatch } from "react-redux"
import { Link, useNavigate } from "react-router-dom"
import { signInWithPopup } from "firebase/auth"

import { login, demoLogin, firebaseAuth } from "../../../services/operations/authAPI"
import { auth, googleProvider } from "../../../config/firebase"

function LoginForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false)

  const { email, password } = formData;

  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e) => {
    e.preventDefault();
    dispatch(login(email, password, navigate))
  }

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      dispatch(firebaseAuth(idToken, {}, navigate))
    } catch (error) {
      console.error("Google sign-in error", error.message)
    }
  }

  return (
    <form
      onSubmit={handleOnSubmit}
      className="mt-6 flex w-full flex-col gap-y-4"
    >
      <label className="w-full">
        <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-richblack-5">
          Email Address <sup className="text-pink-200">*</sup>
        </p>
        <input
          required
          type="text"
          name="email"
          value={email}
          onChange={handleOnChange}
          placeholder="Enter email address"
          style={{
            boxShadow: "inset 0px -1px 0px rgba(255, 255, 255, 0.18)",
          }}
          className="w-full rounded-[0.5rem] bg-richblack-800 p-[12px] text-richblack-5 outline-none"
        />
      </label>

      <label className="relative">
        <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-richblack-5">
          Password <sup className="text-pink-200">*</sup>
        </p>
        <input
          required
          type={showPassword ? "text" : "password"}
          name="password"
          value={password}
          onChange={handleOnChange}
          placeholder="Enter Password"
          style={{
            boxShadow: "inset 0px -1px 0px rgba(255, 255, 255, 0.18)",
          }}
          className="w-full rounded-[0.5rem] bg-richblack-800 p-[12px] pr-12 text-richblack-5 outline-none"
        />
        <span
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-[38px] z-[10] cursor-pointer"
        >
          {showPassword ? (
            <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
          ) : (
            <AiOutlineEye fontSize={24} fill="#AFB2BF" />
          )}
        </span>
        <Link to="/forgot-password">
          <p className="mt-1 ml-auto max-w-max text-xs text-blue-100">
            Forgot Password
          </p>
        </Link>
      </label>


      <button
        type="submit"
        className="mt-6 rounded-[8px] bg-yellow-50 py-[8px] px-[12px] font-medium text-richblack-900"
      >
        Sign In
      </button>

      {/* Divider */}
      <div className="flex items-center gap-x-2">
        <div className="h-[1px] w-full bg-richblack-700" />
        <p className="text-richblack-400 text-sm whitespace-nowrap">or</p>
        <div className="h-[1px] w-full bg-richblack-700" />
      </div>

      {/* Google Sign-In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex items-center justify-center gap-x-2 rounded-[8px] border border-richblack-600 bg-richblack-800 py-[8px] px-[12px] font-medium text-richblack-100 hover:bg-richblack-700 transition-all"
      >
        <FcGoogle fontSize={20} />
        Sign in with Google
      </button>

      {/* Demo Login */}
      <button
        type="button"
        onClick={() => dispatch(demoLogin(navigate))}
        className="rounded-[8px] border border-richblack-600 bg-richblack-800 py-[8px] px-[12px] font-medium text-richblack-100 hover:bg-richblack-700 hover:border-yellow-50 transition-all"
      >
        Try Demo Account
      </button>

      <p className="text-center text-xs text-richblack-400">
        Access all courses instantly — no sign-up needed
      </p>
    </form>
  )
}

export default LoginForm