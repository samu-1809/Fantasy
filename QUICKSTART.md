```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
rm -f db.sqlite3
python manage.py migrate
python manage.py populate_database
python manage.py runserver

cd frontend
npm install
npm run dev
```


```bash
//Para pythonanywhere
cd /home/samugoja1/Fantasy/backend
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py check
rm -f db.sqlite3
python manage.py migrate
python manage.py populate_database
python manage.py collectstatic --noinput
```


