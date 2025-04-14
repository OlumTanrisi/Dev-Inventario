document.addEventListener('DOMContentLoaded', function() {
    // Initial setup
    setupNavigation();
    setCurrentDate();
    loadDashboardData();
    loadInventoryData();
    loadItems();
    setupEventListeners();
});

// Navigation between sections
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('section.page').forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// Set current date for date inputs
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('add-stock-date').value = today;
    document.getElementById('withdraw-stock-date').value = today;
}

// Dashboard Data
async function loadDashboardData() {
    try {
        // Fetch all items
        const itemsResponse = await fetch('/api/items');
        const items = await itemsResponse.json();
        
        // Update stats
        const totalItems = items.length;
        const itemsToOrder = items.filter(item => item.status === 'COMPRAS').length;
        const sufficientItems = items.filter(item => item.status === 'SUFFICIENT').length;
        
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('items-to-purchase').textContent = itemsToOrder;
        document.getElementById('sufficient-items').textContent = sufficientItems;
        
        // Generate charts
        generateStatusChart(items);
        generateTransactionsChart();
        
        // Populate items to purchase table
        await loadPurchaseNeeds();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Generate chart for inventory status
function generateStatusChart(items) {
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    const statusCounts = {
        sufficient: items.filter(item => item.status === 'SUFFICIENT').length,
        toPurchase: items.filter(item => item.status === 'COMPRAS').length
    };
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Sufficient', 'To Purchase'],
            datasets: [{
                data: [statusCounts.sufficient, statusCounts.toPurchase],
                backgroundColor: ['#2ecc71', '#f39c12'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Generate chart for recent transactions
async function generateTransactionsChart() {
    try {
        const response = await fetch('/api/reports/transactions');
        const transactions = await response.json();
        
        // Get last 30 days transactions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
        
        // Group by day and type
        const transactionsByDay = {};
        
        recentTransactions.forEach(transaction => {
            const date = transaction.date;
            if (!transactionsByDay[date]) {
                transactionsByDay[date] = { additions: 0, withdrawals: 0 };
            }
            
            if (transaction.type === 'addition') {
                transactionsByDay[date].additions += 1;
            } else {
                transactionsByDay[date].withdrawals += 1;
            }
        });
        
        // Sort dates
        const sortedDates = Object.keys(transactionsByDay).sort();
        
        const ctx = document.getElementById('transactions-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [
                    {
                        label: 'Additions',
                        data: sortedDates.map(date => transactionsByDay[date].additions),
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        tension: 0.4
                    },
                    {
                        label: 'Withdrawals',
                        data: sortedDates.map(date => transactionsByDay[date].withdrawals),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Transactions'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error generating transactions chart:', error);
    }
}
// Load items that need to be purchased
async function loadPurchaseNeeds() {
    try {
        const response = await fetch('/api/reports/purchase-needs');
        const purchaseNeeds = await response.json();
        
        const tableBody = document.querySelector('#purchase-items-table tbody');
        tableBody.innerHTML = '';
        
        if (purchaseNeeds.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="centered">No items need to be purchased at this time.</td>';
            tableBody.appendChild(row);
            return;
        }
        
        purchaseNeeds.forEach(item => {
            // Make sure we have valid numeric values
            const quantity = Number(item.quantity || item.current_quantity || 0);
            const minThreshold = Number(item.minThreshold || item.min_threshold || 0);
            const toOrder = minThreshold > quantity ? minThreshold - quantity : 0;
            const unit = item.unit || item.measurement_unit || '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name || 'N/A'}</td>
                <td>${quantity} ${unit}</td>
                <td>${minThreshold} ${unit}</td>
                <td>${toOrder} ${unit}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading purchase needs:', error);
    }
}

// Inventory Data
async function loadInventoryData() {
    try {
        const response = await fetch('/api/items');
        const items = await response.json();
        
        const tableBody = document.querySelector('#inventory-table tbody');
        tableBody.innerHTML = '';
        
        items.forEach(item => {
            const row = document.createElement('tr');
            
            // Determine status class
            let statusClass = '';
            if (item.status === 'COMPRAS') {
                statusClass = 'status-warning';
            } else if (item.status === 'SUFFICIENT') {
                statusClass = 'status-success';
            }
            
            // Use proper field mapping to match the database structure
            row.innerHTML = `
                <td>${item.item_id || item.id || 'N/A'}</td>
                <td>${item.name || 'N/A'}</td>
                <td>${item.measurement_unit || item.unit || 'N/A'}</td>
                <td>${item.current_quantity || item.quantity || 0}</td>
                <td><span class="status ${statusClass}">${item.status || 'N/A'}</span></td>
                <td>
                    <button class="btn-icon edit-item" data-id="${item.item_id || item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete-item" data-id="${item.item_id || item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Attach event listeners to action buttons
        attachInventoryActionListeners();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
}


// Attach event listeners to inventory action buttons
function attachInventoryActionListeners() {
    // Edit item buttons
    document.querySelectorAll('.edit-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            openEditItemModal(itemId);
        });
    });
    
    // Delete item buttons
    document.querySelectorAll('.delete-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            confirmDeleteItem(itemId);
        });
    });
}

// Open edit item modal
async function openEditItemModal(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}`);
        const item = await response.json();
        
        document.getElementById('edit-item-id').value = item.item_id || item.id;
        document.getElementById('edit-item-name').value = item.name || '';
        document.getElementById('edit-measurement-unit').value = item.measurement_unit || item.unit || '';
        document.getElementById('edit-min-threshold').value = item.min_threshold || item.minThreshold || 15;
        document.getElementById('edit-max-threshold').value = item.max_threshold || item.maxThreshold || 50;
        document.getElementById('edit-updated-by').value = '';
        
        // Show the modal
        document.getElementById('edit-item-modal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching item details:', error);
    }
}

// Confirm delete item
function confirmDeleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        deleteItem(itemId);
    }
}

// Delete item
async function deleteItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Reload inventory data
            loadInventoryData();
            loadDashboardData();
            loadItems();
            alert('Item deleted successfully.');
        } else {
            const error = await response.json();
            alert(`Failed to delete item: ${error.message}`);
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('An error occurred while deleting the item.');
    }
}

// Load items for dropdowns
async function loadItems() {
    try {
        const response = await fetch('/api/items');
        const items = await response.json();
        
        // Populate add stock dropdown
        const addStockSelect = document.getElementById('add-stock-item');
        addStockSelect.innerHTML = '<option value="">Select an item</option>';
        
        // Populate withdraw stock dropdown
        const withdrawStockSelect = document.getElementById('withdraw-stock-item');
        withdrawStockSelect.innerHTML = '<option value="">Select an item</option>';
        
        // Populate report item dropdown
        const reportItemSelect = document.getElementById('report-item');
        reportItemSelect.innerHTML = '<option value="">All Items</option>';
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.item_id || item.id;
            option.textContent = `${item.name} (${item.current_quantity || item.quantity || 0} ${item.measurement_unit || item.unit})`;
            
            const optionClone1 = option.cloneNode(true);
            const optionClone2 = option.cloneNode(true);
            
            addStockSelect.appendChild(option);
            withdrawStockSelect.appendChild(optionClone1);
            reportItemSelect.appendChild(optionClone2);
        });
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add item button
    document.getElementById('add-new-item-btn').addEventListener('click', function() {
        document.getElementById('add-item-modal').style.display = 'block';
    });
    
    // Close modal buttons
    document.querySelectorAll('.close, #cancel-add-item, #cancel-edit-item').forEach(element => {
        element.addEventListener('click', function() {
            document.getElementById('add-item-modal').style.display = 'none';
            document.getElementById('edit-item-modal').style.display = 'none';
        });
    });
    
    // Add item form submission
    document.getElementById('add-item-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addNewItem();
    });
    
    // Edit item form submission
    document.getElementById('edit-item-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateItem();
    });
    
    // Add stock form submission
    document.getElementById('add-stock-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addStock();
    });
    
    // Withdraw stock form submission
    document.getElementById('withdraw-stock-form').addEventListener('submit', function(e) {
        e.preventDefault();
        withdrawStock();
    });
    
    // Generate report button
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    
    // Report type change
    document.getElementById('report-type').addEventListener('change', toggleReportFilters);
    
    // Export buttons
    document.getElementById('download-csv').addEventListener('click', exportToCSV);
    document.getElementById('download-pdf').addEventListener('click', exportToPDF);
    
    // Search inventory
    document.getElementById('search-inventory').addEventListener('input', searchInventory);
}

// Add new item
async function addNewItem() {
    const name = document.getElementById('item-name').value;
    const unit = document.getElementById('measurement-unit').value;
    const quantity = parseInt(document.getElementById('initial-quantity').value);
    const minThreshold = parseInt(document.getElementById('min-threshold').value);
    const maxThreshold = parseInt(document.getElementById('max-threshold').value);
    
    const itemData = {
        name,
        unit,
        quantity,
        minThreshold,
        maxThreshold,
        status: quantity < minThreshold ? 'COMPRAS' : 'SUFFICIENT'
    };
    
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            // Reset form and close modal
            document.getElementById('add-item-form').reset();
            document.getElementById('add-item-modal').style.display = 'none';
            
            // Reload data
            loadInventoryData();
            loadDashboardData();
            loadItems();
            
            alert('Item added successfully.');
        } else {
            const error = await response.json();
            alert(`Failed to add item: ${error.message}`);
        }
    } catch (error) {
        console.error('Error adding item:', error);
        alert('An error occurred while adding the item.');
    }
}

// Update item
async function updateItem() {
    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value;
    const unit = document.getElementById('edit-measurement-unit').value;
    const minThreshold = parseInt(document.getElementById('edit-min-threshold').value);
    const maxThreshold = parseInt(document.getElementById('edit-max-threshold').value);
    const updatedBy = document.getElementById('edit-updated-by').value;
    
    try {
        // Get current item to get the quantity
        const getResponse = await fetch(`/api/items/${id}`);
        const currentItem = await getResponse.json();
        
        const itemData = {
            id: id,
            item_id: id,
            name: name,
            unit: unit,
            measurement_unit: unit,
            quantity: currentItem.current_quantity || currentItem.quantity || 0,
            current_quantity: currentItem.current_quantity || currentItem.quantity || 0,
            minThreshold: minThreshold,
            min_threshold: minThreshold,
            maxThreshold: maxThreshold,
            max_threshold: maxThreshold,
            status: (currentItem.current_quantity || currentItem.quantity || 0) < minThreshold ? 'COMPRAS' : 'SUFFICIENT',
            updatedBy: updatedBy,
            lastUpdated: new Date().toISOString()
        };
        
        const response = await fetch(`/api/items/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            // Reset form and close modal
            document.getElementById('edit-item-form').reset();
            document.getElementById('edit-item-modal').style.display = 'none';
            
            // Reload data
            loadInventoryData();
            loadDashboardData();
            loadItems();
            
            alert('Item updated successfully.');
        } else {
            const error = await response.json();
            alert(`Failed to update item: ${error.message}`);
        }
    } catch (error) {
        console.error('Error updating item:', error);
        alert('An error occurred while updating the item.');
    }
}

// Add stock
async function addStock() {
    const itemId = document.getElementById('add-stock-item').value;
    const quantity = parseInt(document.getElementById('add-stock-quantity').value);
    const date = document.getElementById('add-stock-date').value;
    const receivedBy = document.getElementById('add-stock-receiver').value;
    const notes = document.getElementById('add-stock-notes').value;
    
    if (!itemId) {
        alert('Please select an item.');
        return;
    }
    
    try {
        // Get current item
        const getResponse = await fetch(`/api/items/${itemId}`);
        const item = await getResponse.json();
        
        // Update item quantity
        const currentQuantity = item.current_quantity || item.quantity || 0;
        const newQuantity = currentQuantity + quantity;
        const minThreshold = item.min_threshold || item.minThreshold || 15;
        const status = newQuantity < minThreshold ? 'COMPRAS' : 'SUFFICIENT';
        
        const itemData = {
            ...item,
            quantity: newQuantity,
            current_quantity: newQuantity,
            status: status,
            updatedBy: receivedBy,
            lastUpdated: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Update item
        const updateResponse = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(error.message);
        }
        
        // Create transaction record
        const transactionData = {
            itemId: itemId,
            type: 'addition',
            quantity: quantity,
            date: date,
            person: receivedBy,
            notes: notes
        };
        
        const transactionResponse = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });
        
        if (!transactionResponse.ok) {
            const error = await transactionResponse.json();
            throw new Error(error.message);
        }
        
        // Reset form
        document.getElementById('add-stock-form').reset();
        setCurrentDate();
        
        // Reload data
        loadInventoryData();
        loadDashboardData();
        loadItems();
        loadRecentAdditions();
        
        alert('Stock added successfully.');
    } catch (error) {
        console.error('Error adding stock:', error);
        alert(`An error occurred while adding stock: ${error.message}`);
    }
}

// Load recent additions
async function loadRecentAdditions() {
    try {
        const response = await fetch('/api/transactions?type=addition&limit=5');
        const additions = await response.json();
        
        const tableBody = document.querySelector('#recent-additions-table tbody');
        tableBody.innerHTML = '';
        
        if (additions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="centered">No recent additions.</td>';
            tableBody.appendChild(row);
            return;
        }
        
        for (const addition of additions) {
            // Get item details
            const itemResponse = await fetch(`/api/items/${addition.itemId}`);
            const item = await itemResponse.json();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${addition.quantity} ${item.unit}</td>
                <td>${addition.date}</td>
                <td>${addition.person}</td>
            `;
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading recent additions:', error);
    }
}

// Withdraw stock
async function withdrawStock() {
    const itemId = document.getElementById('withdraw-stock-item').value;
    const quantity = parseInt(document.getElementById('withdraw-stock-quantity').value);
    const date = document.getElementById('withdraw-stock-date').value;
    const withdrawnBy = document.getElementById('withdraw-stock-person').value;
    const department = document.getElementById('withdraw-stock-department').value;
    const notes = document.getElementById('withdraw-stock-notes').value;
    
    if (!itemId) {
        alert('Please select an item.');
        return;
    }
    
    try {
        // Get current item
        const getResponse = await fetch(`/api/items/${itemId}`);
        const item = await getResponse.json();
        
        // Check if there's enough stock
        const currentQuantity = item.current_quantity || item.quantity || 0;
        if (currentQuantity < quantity) {
            alert(`Not enough stock. Current quantity: ${currentQuantity} ${item.measurement_unit || item.unit}`);
            return;
        }
        
        // Update item quantity
        const newQuantity = currentQuantity - quantity;
        const minThreshold = item.min_threshold || item.minThreshold || 15;
        const status = newQuantity < minThreshold ? 'COMPRAS' : 'SUFFICIENT';
        
        const itemData = {
            ...item,
            quantity: newQuantity,
            current_quantity: newQuantity,
            status: status,
            updatedBy: withdrawnBy,
            lastUpdated: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Update item
        const updateResponse = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(error.message);
        }
        
        // Create transaction record
        const transactionData = {
            itemId: itemId,
            type: 'withdrawal',
            quantity: quantity,
            date: date,
            person: withdrawnBy,
            department: department,
            notes: notes
        };
        
        const transactionResponse = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });
        
        if (!transactionResponse.ok) {
            const error = await transactionResponse.json();
            throw new Error(error.message);
        }
        
        // Reset form
        document.getElementById('withdraw-stock-form').reset();
        setCurrentDate();
        
        // Reload data
        loadInventoryData();
        loadDashboardData();
        loadItems();
        loadRecentWithdrawals();
        
        alert('Stock withdrawn successfully.');
    } catch (error) {
        console.error('Error withdrawing stock:', error);
        alert(`An error occurred while withdrawing stock: ${error.message}`);
    }
}

// Load recent withdrawals
async function loadRecentWithdrawals() {
    try {
        const response = await fetch('/api/transactions?type=withdrawal&limit=5');
        const withdrawals = await response.json();
        
        const tableBody = document.querySelector('#recent-withdrawals-table tbody');
        tableBody.innerHTML = '';
        
        if (withdrawals.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="centered">No recent withdrawals.</td>';
            tableBody.appendChild(row);
            return;
        }
        
        for (const withdrawal of withdrawals) {
            // Get item details
            const itemResponse = await fetch(`/api/items/${withdrawal.itemId}`);
            const item = await itemResponse.json();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${withdrawal.quantity} ${item.unit}</td>
                <td>${withdrawal.date}</td>
                <td>${withdrawal.person}</td>
                <td>${withdrawal.department || '-'}</td>
            `;
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading recent withdrawals:', error);
    }
}

// Toggle report filters based on report type
function toggleReportFilters() {
    const reportType = document.getElementById('report-type').value;
    
    if (reportType === 'transactions') {
        document.getElementById('item-filter-container').style.display = 'block';
        document.getElementById('date-filter-container').style.display = 'block';
    } else if (reportType === 'purchase-needs') {
        document.getElementById('item-filter-container').style.display = 'none';
        document.getElementById('date-filter-container').style.display = 'none';
    }
}

// Generate report
async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const itemId = document.getElementById('report-item').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    try {
        let url = '';
        let reportTitle = '';
        
        if (reportType === 'transactions') {
            url = '/api/reports/transactions';
            reportTitle = 'Transactions Report';
            
            // Add query parameters
            const params = new URLSearchParams();
            if (itemId) params.append('itemId', itemId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        } else if (reportType === 'purchase-needs') {
            url = '/api/reports/purchase-needs';
            reportTitle = 'Purchase Needs Report';
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Update report title
        document.getElementById('report-title').textContent = reportTitle;
        
        // Generate table
        generateReportTable(data, reportType);
    } catch (error) {
        console.error('Error generating report:', error);
        alert('An error occurred while generating the report.');
    }
}

// Generate report table
async function generateReportTable(data, reportType) {
    const table = document.getElementById('report-table');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');
    
    // Clear previous content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        thead.innerHTML = '<th>No Data</th>';
        tbody.innerHTML = '<tr><td class="centered">No data available for the selected filters.</td></tr>';
        return;
    }
    
    // Set headers based on report type
    if (reportType === 'transactions') {
        thead.innerHTML = `
            <th>Item Name</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Person</th>
            <th>Department</th>
            <th>Notes</th>
        `;
        
        // Populate rows
        for (const transaction of data) {
            // Get item details
            const itemResponse = await fetch(`/api/items/${transaction.itemId}`);
            const item = await itemResponse.json();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${transaction.type === 'addition' ? 'Addition' : 'Withdrawal'}</td>
                <td>${transaction.quantity} ${item.unit}</td>
                <td>${transaction.date}</td>
                <td>${transaction.person}</td>
                <td>${transaction.department || '-'}</td>
                <td>${transaction.notes || '-'}</td>
            `;
            tbody.appendChild(row);
        }
    } else if (reportType === 'purchase-needs') {
        thead.innerHTML = `
            <th>Item Name</th>
            <th>Current Quantity</th>
            <th>Minimum Threshold</th>
            <th>Quantity to Order</th>
            <th>Maximum Threshold</th>
        `;
        
        // Populate rows
        data.forEach(item => {
            // Make sure we have valid numeric values
            const quantity = Number(item.quantity || item.current_quantity || 0);
            const minThreshold = Number(item.minThreshold || item.min_threshold || 0);
            const maxThreshold = Number(item.maxThreshold || item.max_threshold || 0);
            const toOrder = minThreshold > quantity ? minThreshold - quantity : 0;
            const unit = item.unit || item.measurement_unit || '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name || 'N/A'}</td>
                <td>${quantity} ${unit}</td>
                <td>${minThreshold} ${unit}</td>
                <td>${toOrder} ${unit}</td>
                <td>${maxThreshold} ${unit}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Export report to CSV
function exportToCSV() {
    const table = document.getElementById('report-table');
    const rows = table.querySelectorAll('tr');
    
    if (rows.length <= 1) {
        alert('No data to export.');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = Array.from(cells).map(cell => `"${cell.textContent}"`).join(',');
        csvContent += rowData + '\r\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export report to PDF
function exportToPDF() {
    const table = document.getElementById('report-table');
    const rows = table.querySelectorAll('tr');
    
    if (rows.length <= 1) {
        alert('No data to export.');
        return;
    }

    // Get report title
    const reportTitle = document.getElementById('report-title').textContent;
    
    // Create PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add table
    doc.autoTable({
        html: '#report-table',
        startY: 35, 
        styles: {
            fontSize: 8
        },
        headStyles: {
            fillColor: [41, 128, 185]
        }
    });
    
    // Save the PDF
    doc.save('report.pdf');
}

// Search inventory
function searchInventory() {
    const searchTerm = document.getElementById('search-inventory').value.toLowerCase();
    const rows = document.querySelectorAll('#inventory-table tbody tr');
    
    rows.forEach(row => {
        const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        
        if (name.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Initial load for recent transactions
document.addEventListener('DOMContentLoaded', function() {
    loadRecentAdditions();
    loadRecentWithdrawals();
});