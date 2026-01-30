import React, { useState, useRef, useEffect } from 'react'

const backgrounds = [
  { name: 'Hearts', path: '/assets/hearts.png' }
]

function App() {
  const [selectedBackground, setSelectedBackground] = useState(backgrounds[0].path)
  const [selectedFilter, setSelectedFilter] = useState('normal')
  const [stage, setStage] = useState('setup') // 'setup', 'photobooth', 'result'
  const [photos, setPhotos] = useState([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [showFlash, setShowFlash] = useState(false)
  const [finalImageData, setFinalImageData] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const finalCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const backgroundImageRef = useRef(null)

  useEffect(() => {
    if (stage === 'photobooth' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          streamRef.current = stream
          videoRef.current.srcObject = stream
        })
        .catch(error => {
          alert('Error accessing camera: ' + error.message)
        })
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [stage])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = selectedBackground
    img.onload = () => {
      backgroundImageRef.current = img
    }
  }, [selectedBackground])

  // Redraw canvas when entering result stage
  useEffect(() => {
    if (stage === 'result' && finalImageData && finalCanvasRef.current) {
      console.log('Redrawing canvas in result stage')
      const canvas = finalCanvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onerror = () => {
        console.error('Failed to load final image data')
      }
      img.onload = () => {
        console.log('Final image loaded, dimensions:', img.width, 'x', img.height)
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        console.log('Canvas redrawn successfully')
      }
      img.src = finalImageData
    }
  }, [stage, finalImageData])


  const startPhotobooth = () => {
    setStage('photobooth')
    setCurrentPhotoIndex(0)
    setPhotos([])
  }

  const takePhoto = () => {
    if (currentPhotoIndex >= 4) return
    startCountdown()
  }

  const startCountdown = () => {
    let seconds = 3
    setCountdown(seconds)
    
    const interval = setInterval(() => {
      seconds--
      if (seconds > 0) {
        setCountdown(seconds)
      } else {
        setCountdown(null)
        clearInterval(interval)
        capturePhoto()
      }
    }, 1000)
  }

  const capturePhoto = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    if (selectedFilter === 'blackwhite') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
    }
    
    const photoData = canvas.toDataURL('image/png')
    
    setShowFlash(true)
    setTimeout(() => {
      setShowFlash(false)
    }, 200)
    
    const newIndex = currentPhotoIndex + 1
    
    // Add photo to array first
    setPhotos(prev => {
      const allPhotos = [...prev, photoData]
      
      if (allPhotos.length === 4) {
        // This is the 4th photo - stop camera immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        
        // Create final image immediately - ensure canvas is in DOM
        setTimeout(() => {
          // Force a re-render to ensure canvas is available, then create image
          setTimeout(() => {
            createFinalImage(allPhotos)
          }, 100)
        }, 300)
      }
      
      return allPhotos
    })
    
    if (newIndex >= 4) {
      // Keep index at 3 (0-indexed, so 3 means 4th photo taken)
      setCurrentPhotoIndex(3)
    } else {
      setCurrentPhotoIndex(newIndex)
    }
  }

  const createFinalImage = (photosToUse) => {
    console.log('createFinalImage called with', photosToUse.length, 'photos')
    
    const finalCanvas = finalCanvasRef.current
    if (!finalCanvas) {
      console.error('Final canvas not available')
      return
    }
    
    const bgImg = backgroundImageRef.current
    if (!bgImg) {
      console.error('Background image not loaded, loading now...')
      // Load background image if not already loaded
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = selectedBackground
      img.onload = () => {
        backgroundImageRef.current = img
        createFinalImage(photosToUse)
      }
      img.onerror = () => {
        console.error('Failed to load background image')
        setStage('result')
      }
      return
    }
    
    console.log('Background image loaded, dimensions:', bgImg.width, 'x', bgImg.height)
    
    const ctx = finalCanvas.getContext('2d')
    finalCanvas.width = bgImg.width
    finalCanvas.height = bgImg.height
    
    // Draw background first
    ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height)
    
    // Calculate positions for 4 photos to fit in the black frames
    // The background has 4 black frames arranged vertically
    // Make photos slightly smaller than frames to ensure they fit
    // Scale images to be 1.2 times bigger
    const photoWidth = bgImg.width * 0.7 * 1.2
    const photoHeight = bgImg.height / 4 * 0.65 * 1.2
    const photoX = (bgImg.width - photoWidth) / 2
    const spacing = bgImg.height / 4 * 0.85  // Reduced spacing between photos
    const startY = spacing * 0.225  // Top image drawn higher
    
    let loadedCount = 0
    const totalPhotos = photosToUse.length
    
    console.log('Starting to composite', totalPhotos, 'photos')
    console.log('Photo dimensions:', photoWidth, 'x', photoHeight)
    console.log('Photo X position:', photoX)
    
    if (totalPhotos === 0) {
      console.error('No photos to composite')
      setStage('result')
      return
    }
    
    // Use Promise.all to ensure all images are loaded before setting stage
    const imagePromises = photosToUse.map((photoData, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onerror = () => {
          console.error(`Failed to load photo ${index + 1}`)
          reject(new Error(`Failed to load photo ${index + 1}`))
        }
        img.onload = () => {
          console.log(`Photo ${index + 1} loaded, dimensions:`, img.width, 'x', img.height)
          const photoY = startY + (spacing * index)
          console.log(`Drawing photo ${index + 1} at position:`, photoX, photoY, 'with size:', photoWidth, 'x', photoHeight)
          
          // Draw the photo onto the canvas
          // Use the full source image and scale it to fit
          ctx.drawImage(img, 0, 0, img.width, img.height, photoX, photoY, photoWidth, photoHeight)
          console.log(`Photo ${index + 1} drawn successfully`)
          resolve()
        }
        img.src = photoData
      })
    })
    
    Promise.all(imagePromises)
      .then(() => {
        console.log('All photos composited successfully')
        // Wait a moment to ensure all drawing is complete, then save the image
        setTimeout(() => {
          // Get the canvas data URL before changing stage
          const imageData = finalCanvas.toDataURL('image/png')
          console.log('Final image data URL length:', imageData.length)
          setFinalImageData(imageData)
          console.log('Final image data saved, dimensions:', finalCanvas.width, 'x', finalCanvas.height)
          setStage('result')
        }, 100)
      })
      .catch((error) => {
        console.error('Error compositing photos:', error)
        setStage('result')
      })
  }

  const downloadImage = () => {
    if (finalImageData) {
      const link = document.createElement('a')
      link.download = 'photobooth-image.png'
      link.href = finalImageData
      link.click()
    } else if (finalCanvasRef.current) {
      const link = document.createElement('a')
      link.download = 'photobooth-image.png'
      link.href = finalCanvasRef.current.toDataURL('image/png')
      link.click()
    }
  }

  const restart = () => {
    setPhotos([])
    setCurrentPhotoIndex(0)
    setStage('setup')
    setFinalImageData(null)
  }

  if (stage === 'setup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <h1>Tiny Photobooth</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <label>Select Background:</label>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {backgrounds.map((bg, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <img 
                  src={bg.path} 
                  alt={bg.name}
                  style={{ 
                    width: '200px', 
                    height: 'auto',
                    cursor: 'pointer',
                    border: selectedBackground === bg.path ? '3px solid black' : '1px solid gray'
                  }}
                  onClick={() => setSelectedBackground(bg.path)}
                />
                <div>{bg.name}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <label>Select Filter:</label>
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="blackwhite">Black & White</option>
          </select>
        </div>
        
        <button onClick={startPhotobooth}>Start Photobooth</button>
      </div>
    )
  }

  if (stage === 'photobooth') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '70vh' }}></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        <canvas ref={finalCanvasRef} style={{ display: 'none' }}></canvas>
        {countdown !== null && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '100px',
            zIndex: 10000
          }}>
            {countdown}
          </div>
        )}
        {showFlash && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'white',
            zIndex: 9999,
            pointerEvents: 'none'
          }}></div>
        )}
        <div>Photo {Math.min(currentPhotoIndex + 1, 4)} of 4</div>
        {photos.length < 4 && (
          <button onClick={takePhoto} disabled={countdown !== null}>
            Take Photo
          </button>
        )}
        {photos.length === 4 && (
          <div>Creating your photo strip...</div>
        )}
      </div>
    )
  }

  if (stage === 'result') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <canvas 
          ref={finalCanvasRef} 
          style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc', display: 'block' }}
        ></canvas>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={downloadImage}>Download Image</button>
          <button onClick={restart}>Start Over</button>
        </div>
      </div>
    )
  }

  return null
}

export default App

