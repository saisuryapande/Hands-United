import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AdminContacted = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setContacts(contacts.map(contact => 
        contact.id === id 
          ? { ...contact, status: newStatus }
          : contact
      ));
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    fetchContacts();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('support_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, () => {
        fetchContacts();
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Contact Management</h1>
      
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Sl.No</th>
                <th className="py-2 px-4 border-b text-left">Name</th>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Contact Number</th>
                <th className="py-2 px-4 border-b text-left">Subject & Message</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{index + 1}</td>
                  <td className="py-2 px-4 border-b">{contact.name}</td>
                  <td className="py-2 px-4 border-b">{contact.email}</td>
                  <td className="py-2 px-4 border-b">{contact.phone}</td>
                  <td className="py-2 px-4 border-b">
                    <div className="font-medium">{contact.subject}</div>
                    <div className="text-sm text-gray-600">{contact.message}</div>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <span 
                      className={`${
                        contact.status === 'resolved' 
                          ? 'text-green-600' 
                          : contact.status === 'in_progress'
                          ? 'text-blue-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="flex gap-2">
                      {contact.status !== 'resolved' && (
                        <>
                          {contact.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(contact.id, 'in_progress')}
                              className="text-blue-500 hover:text-blue-700"
                              title="Mark as In Progress"
                            >
                              In Progress
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(contact.id, 'resolved')}
                            className="text-green-500 hover:text-green-700"
                            title="Mark as Resolved"
                          >
                            <FaCheck />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminContacted;