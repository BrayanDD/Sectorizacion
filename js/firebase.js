  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
  import {getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
  import {getFirestore} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAq2xyvr061fsby73zejZacakTD6lwCu5I",
    authDomain: "sectorizacion-5a0c7.firebaseapp.com",
    projectId: "sectorizacion-5a0c7",
    storageBucket: "sectorizacion-5a0c7.firebasestorage.app",
    messagingSenderId: "422430272645",
    appId: "1:422430272645:web:d1a1aff2e0f039167f8dec",
    measurementId: "G-LZKGQ01JPB"
  };

  // Initialize Firebase

  function showMessage(message, divId){
    var messageDiv=document.getElementById(divId);
    messageDiv.style.display="block";
    messageDiv.innerHTML=message;
    messageDiv.style.opacity="1";
    setTimeout(function(){
      messageDiv.style.opacity="0";
  },5000)}
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  const signUp=document.getElementById("sublogin");
  signUp.addEventListener("click",(event)=>{
    event.preventDefault();
    const username=document.getElementById("username").value;
    const password=document.getElementById("password").value;
    const auth=getAuth();
    const db=getFirestore();

    signInWithEmailAndPassword(auth,username,password)
    .then((userCredential)=>{
      showMessage("Inicio de sesión exitoso","singme");
      const user=userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid);
      console.log("Usuario iniciado:", user);
      window.location.href="../index.html";
    }).catch((error)=>{
      const errorCode=error.code;
      const errorMessage=error.message;
      showMessage("Error al iniciar sesión: "+errorMessage,"singme");
    });

  });

  