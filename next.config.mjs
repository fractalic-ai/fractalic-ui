/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/list_directory',
        destination: 'http://127.0.0.1:8000/list_directory',
      },
      {
        source: '/branches_and_commits',
        destination: 'http://127.0.0.1:8000/branches_and_commits',
      },
      {
        source: '/get_file_content_disk',
        destination: 'http://127.0.0.1:8000/get_file_content_disk',
      },
      {
        source: '/create_file',
        destination: 'http://127.0.0.1:8000/create_file',
      },
      {
        source: '/create_folder',
        destination: 'http://127.0.0.1:8000/create_folder',
      },
      {
        source: '/get_file_content',
        destination: 'http://127.0.0.1:8000/get_file_content',
      },
      {
        source: '/save_file',
        destination: 'http://127.0.0.1:8000/save_file',
      }
    ];
  },
};

export default nextConfig;
