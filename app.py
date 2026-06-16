import time
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes cache

def parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_content = response.content
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return None

    updates = []
    
    # Extract channel-wide info if needed, or loop entries
    for index, entry in enumerate(root.findall('atom:entry', ns)):
        title = entry.find('atom:title', ns)
        title_text = title.text.strip() if title is not None and title.text else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        updated_text = updated.text.strip() if updated is not None and updated.text else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.attrib['href'] if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        
        if content_elem is not None and content_elem.text:
            html_content = content_elem.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            h3s = soup.find_all('h3')
            if not h3s:
                # Fallback if no h3 sections
                updates.append({
                    'id': f"up_{index}_0",
                    'date': title_text,
                    'updated': updated_text,
                    'link': link,
                    'type': 'General',
                    'html': html_content,
                    'text': soup.get_text().strip()
                })
                continue
                
            for sub_index, h3 in enumerate(h3s):
                update_type = h3.get_text().strip()
                
                # Gather all sibling elements until next h3
                sibling_htmls = []
                sibling_texts = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if curr.name:
                        sibling_htmls.append(str(curr))
                        sibling_texts.append(curr.get_text().strip())
                    elif isinstance(curr, str) and curr.strip():
                        # Keep plain text nodes if any exist between tags
                        sibling_htmls.append(curr)
                        sibling_texts.append(curr.strip())
                    curr = curr.next_sibling
                
                html_body = "".join(sibling_htmls).strip()
                text_body = " ".join(sibling_texts).strip()
                
                updates.append({
                    'id': f"up_{index}_{sub_index}",
                    'date': title_text,
                    'updated': updated_text,
                    'link': link,
                    'type': update_type,
                    'html': html_body,
                    'text': text_body
                })
        else:
            # Fallback for empty content
            updates.append({
                'id': f"up_{index}_0",
                'date': title_text,
                'updated': updated_text,
                'link': link,
                'type': 'General',
                'html': '<p>No content provided.</p>',
                'text': 'No content provided.'
            })
            
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION):
        data = parse_feed()
        if data is not None:
            cache["data"] = data
            cache["last_fetched"] = now
        else:
            if not cache["data"]:
                return jsonify({"error": "Failed to fetch release notes and no cached data available"}), 500
            
    return jsonify({
        "updates": cache["data"],
        "cached_at": cache["last_fetched"],
        "is_cached": not force_refresh and (now - cache["last_fetched"] <= CACHE_DURATION)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
