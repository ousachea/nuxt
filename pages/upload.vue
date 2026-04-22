<script setup>
import { ref } from 'vue'
import { collection, addDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const { $db, $storage } = useNuxtApp()

const title = ref('')
const file = ref(null)
const isUploading = ref(false)

const handleFileChange = (e) => {
  file.value = e.target.files[0]
}

const uploadWork = async () => {
  if (!file.value) return alert('Please select an image')
  
  isUploading.value = true
  try {
    // 1. Upload file to "artworks" folder in Storage
    const imagePath = `artworks/${Date.now()}-${file.value.name}`
    const sRef = storageRef($storage, imagePath)
    await uploadBytes(sRef, file.value)
    
    // 2. Get the public URL
    const downloadURL = await getDownloadURL(sRef)

    // 3. Save reference in Firestore
    await addDoc(collection($db, 'works'), {
      title: title.value,
      imageUrl: downloadURL,
      createdAt: new Date()
    })

    alert('Art uploaded successfully!')
    title.value = ''
    file.value = null
  } catch (error) {
    console.error(error)
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="upload-container">
    <h2>Add New Artwork</h2>
    <input v-model="title" placeholder="Artwork Title" />
    <input type="file" @change="handleFileChange" accept="image/*" />
    
    <button @click="uploadWork" :disabled="isUploading">
      {{ isUploading ? 'Uploading...' : 'Publish Work' }}
    </button>
  </div>
</template>

<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 2rem auto;
  padding: 20px;
  border: 1px solid #ccc;
}
input, button {
  padding: 10px;
}
button {
  background: #00dc82; /* Nuxt green */
  color: white;
  border: none;
  cursor: pointer;
}
button:disabled {
  background: #ccc;
}
</style>