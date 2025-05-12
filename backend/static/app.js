const form = document.getElementById("predictForm");
const result = document.getElementById("result");
const tableBody = document.querySelector("#usersTable tbody");
const clearDbBtn = document.getElementById("clearDbBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// Theme switcher logic
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#1a1a2e");
  } else {
    document.body.classList.remove("dark-mode");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f4f7f6");
  }
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  localStorage.setItem("theme", currentTheme);
  applyTheme(currentTheme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}

// Apply saved theme on initial load
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light"; // Default to light
  applyTheme(savedTheme);

  // Page-specific initializations
  if (form) { // We are on index.html
    console.log("Page loaded, initializing prediction form...");
  } else if (tableBody) { // We are on database.html
    console.log("Page loaded, initializing database view...");
    loadUsers();
  }
});

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (result) result.textContent = "Processing...";
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
  
    console.log("Sending prediction request with data:", data);
    
    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
  
      const json = await res.json();
      console.log("Received response:", json);
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      if (result) {
        const isPredictionMalignant = json.prediction === 1;
        const icon = isPredictionMalignant ? 
          '<i class="fas fa-exclamation-triangle" style="color:var(--danger-color);margin-right:8px;"></i>' : 
          '<i class="fas fa-check-circle" style="color:#28a745;margin-right:8px;"></i>';
        result.innerHTML = `${icon} Prediction: ${isPredictionMalignant ? "Malignant" : "Benign"}`;
      }
      form.reset(); // Clear form fields
    } catch (error) {
      console.error("Prediction failed:", error);
      if (result) result.innerHTML = `<i class="fas fa-exclamation-circle" style="color:var(--danger-color);margin-right:8px;"></i> Error: ${error.message || "Failed to process request"}`;
    }
  });
}

async function loadUsers() {
  if (!tableBody) return; // Only run if tableBody exists (on database.html)

  try {
    console.log("Fetching user records...");
    // If result element exists on database.html, use it for status
    const statusResultEl = document.getElementById("result"); 
    if (statusResultEl) statusResultEl.textContent = "Loading records...";

    const res = await fetch("/users");
    
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    
    const users = await res.json();
    console.log(`Received ${users.length} user records`);
    
    tableBody.innerHTML = ""; // Clear existing rows
    
    if (users.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = '<td colspan="12" style="text-align:center"><i class="fas fa-info-circle" style="margin-right:8px;"></i>No records found</td>';
      tableBody.appendChild(emptyRow);
      if (statusResultEl) statusResultEl.innerHTML = '<i class="fas fa-info-circle" style="margin-right:8px;"></i>No records found.';
      return;
    }
    
    users.forEach((u) => {
      const row = document.createElement("tr");
      const predictionIcon = u.prediction === 1 ? 
        '<i class="fas fa-exclamation-triangle" style="color:var(--danger-color);"></i> ' : 
        '<i class="fas fa-check-circle" style="color:#28a745;"></i> ';
      
      row.innerHTML = `
        <td>${u.username || 'N/A'}</td>
        <td>${u.mean_radius !== null && u.mean_radius !== undefined ? u.mean_radius : 'N/A'}</td>
        <td>${u.mean_perimeter !== null && u.mean_perimeter !== undefined ? u.mean_perimeter : 'N/A'}</td>
        <td>${u.mean_area !== null && u.mean_area !== undefined ? u.mean_area : 'N/A'}</td>
        <td>${u.mean_concavity !== null && u.mean_concavity !== undefined ? u.mean_concavity : 'N/A'}</td>
        <td>${u.mean_concave_points !== null && u.mean_concave_points !== undefined ? u.mean_concave_points : 'N/A'}</td>
        <td>${u.worst_radius !== null && u.worst_radius !== undefined ? u.worst_radius : 'N/A'}</td>
        <td>${u.worst_perimeter !== null && u.worst_perimeter !== undefined ? u.worst_perimeter : 'N/A'}</td>
        <td>${u.worst_area !== null && u.worst_area !== undefined ? u.worst_area : 'N/A'}</td>
        <td>${u.worst_concavity !== null && u.worst_concavity !== undefined ? u.worst_concavity : 'N/A'}</td>
        <td>${u.worst_concave_points !== null && u.worst_concave_points !== undefined ? u.worst_concave_points : 'N/A'}</td>
        <td>${predictionIcon}${u.prediction === 1 ? "Malignant" : (u.prediction === 0 ? "Benign" : "N/A")}</td>
      `;
      tableBody.appendChild(row);
    });
    if (statusResultEl) statusResultEl.innerHTML = '<i class="fas fa-check" style="margin-right:8px;color:#28a745;"></i>Records loaded.';
  } catch (error) {
    console.error("Error loading users:", error);
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center"><i class="fas fa-exclamation-circle" style="color:var(--danger-color);margin-right:8px;"></i>Error loading data: ${error.message}</td></tr>`;
    const statusResultEl = document.getElementById("result");
    if (statusResultEl) statusResultEl.innerHTML = `<i class="fas fa-exclamation-circle" style="color:var(--danger-color);margin-right:8px;"></i>Error loading records: ${error.message}`;
  }
}

// Clear Database button handler (only for database.html)
if (clearDbBtn) {
  clearDbBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all records? This action cannot be undone.")) {
      const statusResultEl = document.getElementById("result");
      if (statusResultEl) statusResultEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Clearing database...';
      try {
        const res = await fetch("/clear-db", {
          method: "POST"
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        
        const json = await res.json();
        if (statusResultEl) statusResultEl.textContent = json.message || "Database cleared successfully.";
        loadUsers(); // Refresh the empty table
      } catch (error) {
        console.error("Failed to clear database:", error);
        if (statusResultEl) statusResultEl.textContent = `Error: ${error.message || "Failed to clear database"}`;
      }
    }
  });
}