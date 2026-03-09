import { AudioSchema } from '@/lib/schemas';
import { useAudioStore } from '@/lib/audioStore';

export async function uploadAudio(file: File | Blob): Promise<string> {
  const { setIsUploading, setCurrentAudioUrl } = useAudioStore.getState();
  
  try {
    // Validate
    const validated = AudioSchema.parse({
      file: file,
      size: file.size,
      type: file.type,
    });

    // Upload
    setIsUploading(true);
    const fileName = (file as File).name || 'recording';
    const response = await fetch('/api/upload/audio/signed-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType: file.type }),
    });
    const { signedUrl } = await response.json();

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: validated.file,
      headers: { 
        'Content-Type': file.type || 'audio/mpeg' 
      },
    });

    if (uploadResponse.ok) {
      const url = URL.createObjectURL(file);
      setCurrentAudioUrl(url);
      return url;
    } else {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  } finally {
    setIsUploading(false);
  }
}
