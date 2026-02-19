# tiny photobooth
<img width="863" height="736" alt="Screenshot 2026-02-18 at 6 46 25 PM" src="https://github.com/user-attachments/assets/253ed73a-f995-4b09-b60e-214fad31cc53" />

a fun, interactive photobooth web application built with React that lets users take 4 photos and create a custom photo strip with various backgrounds and filters.

## Features

- **Multiple Background Options**: Choose from 5 different background designs (hearts, brown, green stripes, multi stripes, white)
- **Photo Filters**: Apply normal, black & white, or sepia filters to your photos
- **Automatic Photo Capture**: Takes 4 photos automatically with a 3-2-1 countdown before each
- **Real-time Preview**: See your photos with the selected filter applied in real-time
- **Photo Strip Creation**: Automatically composites all 4 photos onto your selected background
- **Download**: Download your final photo strip as a PNG image
- **Responsive Design**: Fully responsive layout that scales with window size
- **Beautiful UI**: Custom styling with Emilys Candy font and themed colors

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## How to Use

1. **Select Background**: Choose one of the 5 available backgrounds by clicking on the preview image
2. **Select Filter**: Choose your preferred filter (normal, black & white, or sepia)
3. **Start Photobooth**: Click the "start photobooth" button
4. **Allow Camera Access**: Grant permission for the application to access your camera
5. **Automatic Photo Capture**: The app will automatically take 4 photos with a countdown before each
6. **View Your Photo Strip**: After all 4 photos are taken, your custom photo strip will be displayed
7. **Download**: Click "download image" to save your photo strip

## Project Structure

```
tinyphotobooth/
├── assets/              # Background images and assets
├── public/
│   └── assets/         # Public assets (backgrounds, logo, start button)
├── src/
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # React entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Technologies Used

- **React**: UI library
- **Vite**: Build tool and development server
- **Canvas API**: For image composition and filtering
- **MediaDevices API**: For camera access

## Browser Compatibility

- Modern browsers with camera support
- Requires HTTPS in production (or localhost for development)
- Best experience on Chrome, Firefox, Safari, or Edge

## License

This project is open source and available for personal use.

