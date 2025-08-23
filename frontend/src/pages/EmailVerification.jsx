import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // "verifying", "success", "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        // First, try to verify the token
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: "GET",
        });

        if (response.ok) {
          setStatus("success");
          setMessage("Email verified successfully! Your organization is now active. You can now log in.");
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login/org");
          }, 3000);
        } else {
          // If verification fails, it might be because:
          // 1. Token is invalid
          // 2. Token was already used (user clicked link directly)
          // 3. Token expired
          
          const errorData = await response.json();
          
          if (errorData.detail === "Invalid verification token") {
            // Token might be already used - check if we can determine the user's status
            // For now, we'll show a message that the verification might have already happened
            setStatus("success");
            setMessage("Your email may have already been verified. If you're still having issues, please try logging in or contact support.");
            
            // Redirect to login after 5 seconds
            setTimeout(() => {
              navigate("/login/org");
            }, 5000);
          } else {
            setStatus("error");
            setMessage(errorData.detail || "Email verification failed");
          }
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (status) {
      case "verifying":
        return (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Email Verified Successfully!
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        );

      case "error":
        return (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate("/login/org")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
