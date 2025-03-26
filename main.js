    const ATTRIBUTES_URL = 'https://raw.githubusercontent.com/openshift/openshift-docs/main/_attributes/common-attributes.adoc';
    const container = document.getElementById('attributes-container');
    const filterInput = document.getElementById('filter-box');

    let attributes = [];
    let conditionals = {};

    async function loadAttributes() {
      try {
        const response = await fetch(ATTRIBUTES_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const content = await response.text();
        parseAttributes(content);
        renderAttributes();
      } catch (error) {
        container.textContent = 'All is lost!';
        console.error('Could not get attrs from common-attributes.doc', error);
      }
    }

    function parseAttributes(content) {
      let currentCondition = null;

      content.split('\n').forEach(line => {
        if (line.startsWith('//')) return;

        const conditionMatch = line.match(/^ifdef::(.+?)\[\]/);
        if (conditionMatch) {
          currentCondition = conditionMatch[1];
          return;
        }

        if (line.startsWith('endif::')) {
          currentCondition = null;
          return;
        }

        const attrMatch = line.match(/^:([^:]+):\s*(.+)$/);
        if (attrMatch && attrMatch[2] && !['!', ''].includes(attrMatch[2])) {
          const attr = { name: attrMatch[1], value: attrMatch[2] };

          if (attr.name === '_mod-docs-content-type') return;

          if (currentCondition) {
            if (!conditionals[currentCondition]) {
              conditionals[currentCondition] = [];
            }
            conditionals[currentCondition].push(attr);
          } else {
            attributes.push(attr);
          }
        }
      });

      attributes.sort((a, b) => a.name.localeCompare(b.name));

      for (const condition of Object.keys(conditionals)) {
        conditionals[condition].sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    function createAttributeHTML(attr) {
      return `
        <div class="attribute">
          <div>
            <div class="attr-name">${attr.name}</div>
            <div class="attr-value">${attr.value}</div>
          </div>
          <button data-value="${attr.value}">Copy</button>
        </div>
      `;
    }

    function renderAttributes(filter = '') {
      const filterText = filter.toLowerCase();
      const hasMatch = (attr, text) =>
        attr.name.toLowerCase().includes(text) ||
        attr.value.toLowerCase().includes(text);

      const mainAttributes = attributes
        .filter(a => hasMatch(a, filterText))
        .map(createAttributeHTML);

      const conditionalSections = Object.entries(conditionals)
        .map(([condition, attrs]) => {
          const filtered = attrs
            .filter(a => hasMatch(a, filterText))
            .map(createAttributeHTML);

          if (filtered.length === 0) return '';
          // TODO: State for no matches
          return `
            <div class="conditional-section">
              <div class="attr-name">Condition: ${condition}</div>
              ${filtered.join('')}
            </div>
          `;
        });

      container.innerHTML = mainAttributes.join('') + conditionalSections.join('');
    }

    container.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') {
        navigator.clipboard.writeText(e.target.dataset.value)
          .then(() => alert('Copied!'))
          .catch(err => console.error('Copy failed:', err));
      }
    });

    filterInput.addEventListener('input', (e) => {
      renderAttributes(e.target.value);
    });

    loadAttributes();