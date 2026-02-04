// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    alert('Please login to sell items');
    window.location.href = '/login.html';
    return;
  }
});

function triggerUpload() {
  document.getElementById("imageUpload").click();
}

/* Image Preview */
document.getElementById("imageUpload").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      this.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("previewImg").src = reader.result;
      document.getElementById("previewImg").classList.remove("d-none");
      document.getElementById("uploadText").style.display = "none";
    };
    reader.readAsDataURL(file);
  }
});

/* Submit Form */
document.getElementById("sellForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = this;
  const conditionChecked = document.querySelector('input[name="condition"]:checked');
  const imageFile = document.getElementById("imageUpload").files[0];

  if (!conditionChecked) {
    document.getElementById("conditionError").style.display = "block";
  } else {
    document.getElementById("conditionError").style.display = "none";
  }

  if (!form.checkValidity() || !conditionChecked) {
    form.classList.add("was-validated");
    return;
  }

  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login to sell items');
    window.location.href = '/login.html';
    return;
  }

  // Get form data
  const title = document.getElementById("itemTitle").value.trim();
  const price = parseFloat(document.getElementById("itemPrice").value);
  const stock = parseInt(document.getElementById("itemStock").value);
  const category = document.getElementById("itemCategory").value;
  const description = document.getElementById("itemDescription").value.trim();
  const condition = conditionChecked.value;
  
  // Get image (base64 or placeholder)
  let imageUrl = 'https://dummyimage.com/300x350/ccc/000';
  if (imageFile) {
    const reader = new FileReader();
    reader.onload = async () => {
      imageUrl = reader.result; // base64 data URL
      await submitListing(title, price, stock, category, description, condition, imageUrl, token);
    };
    reader.readAsDataURL(imageFile);
  } else {
    await submitListing(title, price, stock, category, description, condition, imageUrl, token);
  }
});

async function submitListing(name, price, stock, category, description, condition, image, token) {
  const submitBtn = document.querySelector('.sell-submit');
  const originalText = submitBtn.innerHTML;
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

    const response = await fetch('/api/products/sell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        price,
        stock,
        category,
        description,
        condition,
        image
      })
    });

    // Handle different response statuses
    if (response.status === 413) {
      throw new Error('Image file is too large. Please use an image smaller than 5MB or compress it before uploading.');
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Server returned ${response.status}: ${response.statusText}. Please check your authentication and try again.`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    if (data.ok) {
      // Show success message
      document.getElementById('successMessage').classList.remove('d-none');
      
      // Reset form
      document.getElementById('sellForm').reset();
      document.getElementById('previewImg').classList.add('d-none');
      document.getElementById('uploadText').style.display = '';
      document.getElementById('conditionError').style.display = 'none';
      document.getElementById('sellForm').classList.remove('was-validated');
      
      // Scroll to success message
      document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Hide success message after 8 seconds
      setTimeout(() => {
        document.getElementById('successMessage').classList.add('d-none');
      }, 8000);
    } else {
      alert('Failed to submit listing: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error submitting listing:', err);
    alert('Error submitting listing: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

