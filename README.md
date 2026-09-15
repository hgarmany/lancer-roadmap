# Lancer Roadmap

## Get Started

### LCP Content

Lancer Content Packages (`.lcp` files) can be installed through the
application's LCP interface after the app is running. They are not required to
start the base application and work on builds using the core Lancer ruleset.
Rights in imported packages remain subject to the terms supplied by their
respective authors and publishers.

### Run the Tool Locally

You may also download and run Lancer Roadmap on your own computer.
The application runs locally through Vite. It does not require an account,
database, API key, or separate backend server.

#### Requirements

- [Git](https://git-scm.com/downloads), for downloading and pulling changes to
  the repository.
- [Node.js](https://nodejs.org/), including npm. The installed version of Vite
  requires Node.js `20.19.x`, or `22.12.0` or newer. A current Node.js LTS
  release is recommended.
- A modern web browser (e.g. Firefox, Chrome, Edge).

#### Installation

Confirm the required tools are installed and up-to-date:

```sh
git --version
node --version
npm --version
```

Download the repository to the desired path on your computer:

```sh
git clone https://github.com/hgarmany/lancer-roadmap.git
cd lancer-roadmap
```

Alternatively, download the repository as a ZIP from GitHub, extract it, and
access the command line in the extracted folder.

For a fresh checkout, install the versions recorded in `package-lock.json`:

```sh
npm ci
```

Use `npm install` instead if you are intentionally changing or updating the
project's dependencies.

#### Start the Local Server

Create a production build:

```sh
npm run build
```

And start the server with:

```sh
npm run preview
```

Vite will display the local address and open it in your default browser.
The address is typically:

```text
http://localhost:4173/lancer-roadmap/
```

Keep the terminal open while using the application. Press `Ctrl+C` in that
terminal to stop the server.

## License

Lancer Roadmap Copyright (C) 2026 Hugh Garmany

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.