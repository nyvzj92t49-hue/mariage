# Serveur d'envoi des photos

Ce serveur reçoit les photos et vidéos envoyées depuis `envoyer.html` et les écrit sur le disque externe.

Formats acceptés : jpg, jpeg, png, heic, webp, mp4, mov, m4v et webm. Les images sont limitées à 50 Mo et les vidéos à 2 Go par fichier.

## Installation et démarrage

Dans Terminal :

```sh
cd "/Users/romone/Documents/Documents - Mac mini - 1/Mariage/App/mariage/serveur-upload"
npm install
npm start
```

Par défaut, le dossier cible est `/Volumes/Sans titre/MARIAGE` et le serveur écoute le port `3000`.
Au démarrage, il s'arrête avec un message clair si ce dossier n'existe pas.

Pour changer la destination (par exemple plus tard vers un NAS) sans modifier le code :

```sh
UPLOAD_DIRECTORY="/Volumes/Mon NAS/MARIAGE" npm start
```

## Test local

Lancez le serveur, puis dans un second Terminal, à la racine du site :

```sh
python3 -m http.server 8000
```

Ouvrez ensuite `http://localhost:8000/envoyer.html`. La variable `UPLOAD_SERVER_URL` dans cette page doit valoir `http://localhost:3000` pour ce test.

Pour tester l'état du serveur :

```sh
curl http://localhost:3000/health
```

Pour tester un envoi sans passer par le navigateur :

```sh
curl -F "file=@../logo.png;type=image/png" http://localhost:3000/upload
```

## Accès par les invités

Un serveur local seul n'est pas joignable par les invités via GitHub Pages. De plus, une page HTTPS ne peut pas envoyer des fichiers vers une adresse HTTP : le navigateur bloque ce contenu mixte. Pour l'usage réel, exposez ce serveur avec une URL HTTPS (reverse proxy, tunnel ou NAS HTTPS), puis remplacez `UPLOAD_SERVER_URL` dans `envoyer.html` par cette URL.
