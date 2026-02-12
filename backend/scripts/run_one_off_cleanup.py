import os, json, datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
ret_hours=os.getenv('UPLOAD_RETENTION_HOURS','10')
ret_s=float(ret_hours)*3600.0
uploads=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
now=datetime.datetime.utcnow().timestamp()
print('uploads dir:', uploads)
print('retention_seconds=',ret_s)
for name in os.listdir(uploads):
    if name.endswith('.meta.json'):
        continue
    path=os.path.join(uploads,name)
    meta_path=path+'.meta.json'
    created_ts=None
    if os.path.exists(meta_path):
        try:
            with open(meta_path,'r',encoding='utf-8') as f:
                data=json.load(f)
            uploaded_at=data.get('uploaded_at')
            if uploaded_at:
                created_ts=datetime.datetime.fromisoformat(uploaded_at.replace('Z','+00:00')).timestamp()
        except Exception as e:
            print('failed to read meta',meta_path,e)
    if created_ts is None:
        try:
            created_ts=os.path.getmtime(path)
        except Exception as e:
            print('skip',path,'stat failed',e)
            continue
    age=now-created_ts
    print(name,'age_seconds=',age)
    if age>=ret_s:
        print('DELETE ->',path)
        try:
            os.remove(path)
            print('deleted',path)
        except Exception as e:
            print('failed to delete',path,e)
        # remove sidecars
        txt_path=path+'.txt' if not path.lower().endswith('.txt') else None
        if txt_path and os.path.exists(txt_path):
            try:
                os.remove(txt_path)
                print('deleted sidecar',txt_path)
            except Exception as e:
                print('failed delete sidecar',txt_path,e)
        if os.path.exists(meta_path):
            try:
                os.remove(meta_path)
                print('deleted meta',meta_path)
            except Exception as e:
                print('failed delete meta',meta_path,e)
print('done')
