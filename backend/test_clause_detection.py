"""
Test script to verify clause detection with position-based search.
This tests the actual uploaded PDF text file with formatting markers.
"""

from app.services.clause_detection_service import analyze_clause_detection
import os

def test_uploaded_file():
    """Test the clause detection with the actual uploaded file."""
    
    # Read the uploaded casefile
    file_path = "uploads/casefile1.pdf.txt"
    
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        sample_judgment = f.read()
    
    print("=" * 80)
    print("CLAUSE DETECTION TEST - Actual Uploaded File (casefile1.pdf.txt)")
    print("=" * 80)
    print()
    
    # Show a preview of the raw text
    print("📄 RAW TEXT PREVIEW (first 500 chars):")
    print(sample_judgment[:500])
    print("...")
    print()
    
    # Analyze the document
    result = analyze_clause_detection(sample_judgment)
    
    # Display results
    print(f"✅ Analysis Status: {result['success']}")
    print(f"📄 Text Length: {result['text_length']} characters")
    print(f"📝 Word Count: {result['word_count']} words")
    print(f"🔍 Clauses Analyzed: {result['clauses_analyzed']}")
    print()
    
    # Display statistics
    stats = result['statistics']
    print("📊 DETECTION STATISTICS:")
    print(f"   Total Clauses: {stats['total_clauses']}")
    print(f"   ✅ Present: {stats['present']} ({stats['completion_percentage']}%)")
    print(f"   ❌ Missing: {stats['missing']}")
    print(f"   ⚠️  Corrupted: {stats['corrupted']}")
    print()
    
    # Group clauses by status
    present_clauses = []
    missing_clauses = []
    corrupted_clauses = []
    
    for clause in result['clauses']:
        if clause['status'] == 'Present':
            present_clauses.append(clause)
        elif clause['status'] == 'Missing':
            missing_clauses.append(clause)
        else:
            corrupted_clauses.append(clause)
    
    # Display present clauses
    if present_clauses:
        print(f"✅ PRESENT CLAUSES ({len(present_clauses)}):")
        for clause in present_clauses:
            content_preview = clause['content'][:80].replace('\n', ' ').strip() if clause['content'] else ''
            print(f"   • {clause['clause_name']}")
            if content_preview:
                print(f"     \"{content_preview}...\"")
        print()
    
    # Display missing clauses
    if missing_clauses:
        print(f"❌ MISSING CLAUSES ({len(missing_clauses)}):")
        for clause in missing_clauses:
            print(f"   • {clause['clause_name']}")
        print()
    
    # Display corrupted regions
    if result['corrupted_regions']:
        print(f"⚠️  CORRUPTED REGIONS ({len(result['corrupted_regions'])}):")
        for region in result['corrupted_regions']:
            print(f"   • {region['clause_name']}")
            print(f"     Position: chars {region['start']}-{region['end']}")
            print(f"     Text: \"{region['text'][:60]}...\"")
        print()
    
    print("=" * 80)
    print("TEST COMPLETED")
    print("=" * 80)
    
    # Summary
    if stats['present'] >= 15:
        print("✅ SUCCESS: Detection is working well!")
        print(f"✅ {stats['present']}/28 clauses detected ({stats['completion_percentage']}%)")
    else:
        print("⚠️ WARNING: Low detection rate")
        print(f"Only {stats['present']}/28 clauses detected ({stats['completion_percentage']}%)")
    
    return result


if __name__ == "__main__":
    test_uploaded_file()
