const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token || token !== 'Bearer authenticated') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please login first.',
    });
  }
  
  next();
};

// Apply authentication to all routes
router.use(authenticate);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const templatesFile = path.join(dataDir, 'templates.json');

// Helper function to read templates
function readTemplates() {
  try {
    if (fs.existsSync(templatesFile)) {
      let data = fs.readFileSync(templatesFile, 'utf8');
      // Remove BOM if present and trim whitespace
      data = data.replace(/^\uFEFF/, '').trim();
      // If file is empty or only whitespace, return empty array
      if (!data || data === '') {
        return [];
      }
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading templates:', error);
    // If JSON is invalid, return empty array and optionally fix the file
    try {
      fs.writeFileSync(templatesFile, '[]', 'utf8');
    } catch (writeError) {
      console.error('Error fixing templates.json:', writeError);
    }
    return [];
  }
}

// Helper function to write templates
function writeTemplates(templates) {
  try {
    fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing templates:', error);
    return false;
  }
}

// GET /api/templates - Get templates for a specific user
router.get('/', (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const templates = readTemplates();
    // Filter templates by userId
    const userTemplates = templates.filter(t => t.userId === userId);
    
    res.json({
      success: true,
      templates: userTemplates,
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
      details: error.message,
    });
  }
});

// GET /api/templates/:id - Get a specific template
router.get('/:id', (req, res) => {
  try {
    const userId = req.query.userId;
    const templates = readTemplates();
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Verify that the template belongs to the requesting user
    if (userId && template.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This template does not belong to you.',
      });
    }
    
    res.json({
      success: true,
      template: template,
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template',
      details: error.message,
    });
  }
});

// POST /api/templates - Create a new template
router.post('/', (req, res) => {
  try {
    const { name, subject, text, html, userId } = req.body;

    if (!name || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Template name and subject are required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        error: 'Template content (text or html) is required',
      });
    }

    const templates = readTemplates();
    const newTemplate = {
      id: Date.now().toString(),
      userId: userId,
      name: name,
      subject: subject,
      text: text || '',
      html: html || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templates.push(newTemplate);
    
    if (writeTemplates(templates)) {
      res.json({
        success: true,
        message: 'Template saved successfully',
        template: newTemplate,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save template',
      });
    }
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      details: error.message,
    });
  }
});

// PUT /api/templates/:id - Update a template
router.put('/:id', (req, res) => {
  try {
    const { name, subject, text, html, userId } = req.body;
    const templates = readTemplates();
    const templateIndex = templates.findIndex(t => t.id === req.params.id);

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Verify that the template belongs to the requesting user
    if (userId && templates[templateIndex].userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This template does not belong to you.',
      });
    }

    if (name) templates[templateIndex].name = name;
    if (subject) templates[templateIndex].subject = subject;
    if (text !== undefined) templates[templateIndex].text = text;
    if (html !== undefined) templates[templateIndex].html = html;
    templates[templateIndex].updatedAt = new Date().toISOString();

    if (writeTemplates(templates)) {
      res.json({
        success: true,
        message: 'Template updated successfully',
        template: templates[templateIndex],
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update template',
      });
    }
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      details: error.message,
    });
  }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', (req, res) => {
  try {
    const userId = req.query.userId;
    const templates = readTemplates();
    const templateIndex = templates.findIndex(t => t.id === req.params.id);

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Verify that the template belongs to the requesting user
    if (userId && templates[templateIndex].userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This template does not belong to you.',
      });
    }

    templates.splice(templateIndex, 1);

    if (writeTemplates(templates)) {
      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete template',
      });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      details: error.message,
    });
  }
});

module.exports = router;

