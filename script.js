function verifierCode() {

    const code = document.getElementById("code").value;

    if(code === "RM140827"){
        window.location.href = "galerie.html";
    } else {
        document.getElementById("erreur").textContent =
        "Code incorrect";
    }

}