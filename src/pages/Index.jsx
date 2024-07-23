import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { openDB } from 'idb';

const dbPromise = openDB('SunoSongsDB', 1, {
  upgrade(db) {
    db.createObjectStore('songs', { keyPath: 'id' });
  },
});

const fetchSongs = async () => {
  const response = await fetch('https://studio-api.suno.ai/api/feed/v2?page=0');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSongs, setFilteredSongs] = useState([]);

  const { data: songsData, isLoading, error } = useQuery({
    queryKey: ['songs'],
    queryFn: fetchSongs,
  });

  useEffect(() => {
    if (songsData) {
      storeSongsInDB(songsData.items);
    }
  }, [songsData]);

  const storeSongsInDB = async (songs) => {
    const db = await dbPromise;
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    songs.forEach(song => {
      store.put(song);
    });
    await tx.done;
  };

  const searchSongs = async () => {
    const db = await dbPromise;
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const allSongs = await store.getAll();
    const filtered = allSongs.filter(song =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSongs(filtered);
  };

  useEffect(() => {
    if (searchTerm) {
      searchSongs();
    } else {
      setFilteredSongs([]);
    }
  }, [searchTerm]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Suno Songs Search</h1>
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Button onClick={searchSongs}>Search</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => (
          <Card key={song.id}>
            <CardHeader>
              <CardTitle>{song.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Artist:</strong> {song.artist}</p>
              <p><strong>Album:</strong> {song.album}</p>
              <p><strong>Release Date:</strong> {new Date(song.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {searchTerm && filteredSongs.length === 0 && (
        <p className="text-center mt-4">No results found.</p>
      )}
    </div>
  );
};

export default Index;